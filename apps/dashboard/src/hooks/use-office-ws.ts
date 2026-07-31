"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Client, Room } from "colyseus.js";
import { WS_URL } from "@/lib/paths";
import type {
  AgentStatus,
  AgentStatusPayload,
  AgentMessagePayload,
  AgentActionPayload,
  AgentHiredPayload,
  HiredAgent,
  BoardStartedPayload,
  TaskCreatedPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
} from "@aihq/types";

export interface AgentStatusEvent {
  id: string;
  status: AgentStatus;
}

export interface AgentMessageEvent {
  agentId: string;
  message: string;
  timestamp: number;
  isReport?: boolean;
}

export interface AgentHiredEvent {
  id: string;
  name: string;
  role: string;
  emoji?: string;
  deskPosition: [number, number, number];
}

import { applyTaskCreated, applyTaskCompleted, applyTaskFailed, mapSyncTasks, logActivity, notify } from "./office-ws-handlers";
export type { TaskEvent } from "./office-ws-handlers";
import type { TaskEvent } from "./office-ws-handlers";

export interface BoardMeetingState {
  active: boolean;
  participants: string[];
}

export interface OfficeWsState {
  connected: boolean;
  agentStatuses: Record<string, AgentStatusEvent["status"]>;
  messages: AgentMessageEvent[];
  tasks: TaskEvent[];
  hiredAgents: AgentHiredEvent[];
  boardMeeting: BoardMeetingState;
  paHeadingToCeo: boolean;   // true when PA is walking to CEO corner for a report delivery
}


export function useOfficeWs() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [state, setState] = useState<OfficeWsState>({
    connected: false,
    agentStatuses: {},
    messages: [],
    tasks: [],
    hiredAgents: [],
    boardMeeting: { active: false, participants: [] },
    paHeadingToCeo: false,
  });

  const connect = useCallback(async () => {
    if (roomRef.current) return;

    try {
      const client = new Client(WS_URL);
      clientRef.current = client;

      const room = await client.joinOrCreate("office");
      roomRef.current = room;

      setState((prev) => ({ ...prev, connected: true }));

      // BUG FIX: server broadcasts { agentId, status } but we were reading data.id
      // (`id` kept as a legacy fallback field — the contract only has agentId)
      room.onMessage("agent:status", (data: AgentStatusPayload & { id?: string }) => {
        const id = data.agentId || data.id;
        if (!id) return;
        setState((prev) => ({
          ...prev,
          agentStatuses: { ...prev.agentStatuses, [id]: data.status },
        }));
      });

      room.onMessage("agent:message", (data: AgentMessagePayload) => {
        const msg: AgentMessageEvent = {
          agentId: data.agentId,
          message: data.message,
          timestamp: Date.now(),
          isReport: data.isReport ?? false,
        };
        setState((prev) => ({
          ...prev,
          messages: [msg, ...prev.messages].slice(0, 200),
          // PA delivers a report to the CEO → set heading-to-ceo flag
          paHeadingToCeo:
            data.agentId === "pa" && data.targetId === "ceo" && data.isReport === true,
        }));
      });

      room.onMessage("agent:action", (data: AgentActionPayload) => {
        logActivity(
          "tool_use",
          `${data.agentId}: ${data.action} — ${(data.detail ?? "").slice(0, 120)}`,
          "success",
          data.agentId,
        );
      });

      room.onMessage("agent:hired", (data: AgentHiredPayload) => {
        // Server nests the payload under `agent`: { type, agent: { id, name, role, deskPosition } }
        const a = (data.agent || data) as HiredAgent & { emoji?: string };
        if (!a?.id) return;
        const hired: AgentHiredEvent = {
          id: a.id,
          name: a.name,
          role: a.role,
          emoji: a.emoji,
          deskPosition: a.deskPosition,
        };
        setState((prev) =>
          prev.hiredAgents.some((h) => h.id === hired.id)
            ? prev
            : { ...prev, hiredAgents: [...prev.hiredAgents, hired] }
        );
        logActivity("agent_hired", `New agent hired: ${hired.name} (${hired.role})`, "success");
        notify("New hire", `${hired.name} joined as ${hired.role}`, "success", "/office");
      });

      room.onMessage("board:started", (data: BoardStartedPayload) => {
        setState((prev) => ({
          ...prev,
          boardMeeting: { active: true, participants: data.participants ?? [] },
        }));
      });

      room.onMessage("board:ended", () => {
        setState((prev) => ({
          ...prev,
          boardMeeting: { active: false, participants: [] },
        }));
      });

      room.onMessage("task:created", (data: TaskCreatedPayload) => {
        setState((prev) => ({ ...prev, tasks: applyTaskCreated(prev.tasks, data, Date.now()) }));
      });

      room.onMessage("task:completed", (data: TaskCompletedPayload) => {
        const t = (data.task || data) as TaskCompletedPayload["task"] & { agentId?: string };
        setState((prev) => ({ ...prev, tasks: applyTaskCompleted(prev.tasks, data) }));
        logActivity(
          "task",
          `Completed: ${t.title || t.id}`,
          "success",
          t.assignedTo || t.agentId,
        );
        notify("Task completed", t.title || t.id, "success", "/tasks");
      });

      room.onMessage("task:failed", (data: TaskFailedPayload) => {
        const t = (data.task || data) as TaskFailedPayload["task"] & { agentId?: string };
        setState((prev) => ({ ...prev, tasks: applyTaskFailed(prev.tasks, data) }));
        logActivity(
          "task",
          `Failed: ${t.title || t.id}${t.error ? ` — ${String(t.error).slice(0, 100)}` : ""}`,
          "error",
          t.assignedTo || t.agentId,
        );
        notify(
          "Task failed",
          `${t.title || t.id}${t.error ? ` — ${String(t.error).slice(0, 100)}` : ""}`,
          "error",
          "/tasks",
        );
      });

      // Initial state pushed by the server on join — without these handlers the
      // sync data is dropped (and colyseus.js logs 'onMessage() not registered').
      room.onMessage("tasks-sync", (tasks: Array<{ id: number; title: string; assignedTo: string; status: string; completedAt?: string }>) => {
        if (!Array.isArray(tasks)) return;
        setState((prev) => ({ ...prev, tasks: mapSyncTasks(tasks, Date.now()) }));
      });

      room.onMessage("agents-sync", (agents: Array<{ id: string; status: AgentStatusPayload["status"] }>) => {
        if (!Array.isArray(agents)) return;
        setState((prev) => ({
          ...prev,
          agentStatuses: {
            ...prev.agentStatuses,
            ...Object.fromEntries(agents.map((a) => [a.id, a.status])),
          },
        }));
      });

      room.onLeave(() => {
        setState((prev) => ({ ...prev, connected: false }));
        roomRef.current = null;
        setTimeout(connect, 3000);
      });

      // All handlers registered — pull the initial state (pushing from the
      // server's onJoin would race these registrations).
      room.send("sync-request");
    } catch {
      setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      roomRef.current?.leave();
      roomRef.current = null;
      clientRef.current = null;
    };
  }, [connect]);

  return state;
}
