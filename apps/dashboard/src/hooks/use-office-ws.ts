"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Client, Room } from "colyseus.js";
import { WS_URL } from "@/lib/paths";

export interface AgentStatusEvent {
  id: string;
  status: "idle" | "working" | "thinking" | "talking" | "in-meeting";
}

export interface AgentMessageEvent {
  agentId: string;
  message: string;
  timestamp: number;
}

export interface AgentHiredEvent {
  id: string;
  name: string;
  role: string;
  emoji?: string;
  deskPosition: [number, number, number];
}

export interface TaskEvent {
  id: string;
  title: string;
  agentId: string;
  status: "created" | "completed";
  output?: string;
  outputPath?: string;
  timestamp: number;
}

export interface OfficeWsState {
  connected: boolean;
  agentStatuses: Record<string, AgentStatusEvent["status"]>;
  messages: AgentMessageEvent[];
  tasks: TaskEvent[];
  hiredAgents: AgentHiredEvent[];
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
  });

  const connect = useCallback(async () => {
    if (roomRef.current) return;

    try {
      const client = new Client(WS_URL);
      clientRef.current = client;

      const room = await client.joinOrCreate("office");
      roomRef.current = room;

      setState((prev) => ({ ...prev, connected: true }));

      room.onMessage("agent:status", (data: AgentStatusEvent) => {
        setState((prev) => ({
          ...prev,
          agentStatuses: { ...prev.agentStatuses, [data.id]: data.status },
        }));
      });

      room.onMessage("agent:message", (data: AgentMessageEvent) => {
        setState((prev) => ({
          ...prev,
          messages: [data, ...prev.messages].slice(0, 200),
        }));
      });

      room.onMessage("agent:hired", (data: AgentHiredEvent) => {
        setState((prev) => ({
          ...prev,
          hiredAgents: [...prev.hiredAgents, data],
        }));
      });

      room.onMessage("task:created", (data: any) => {
        // Server sends { type, task: { id, title, assignedTo, status, createdAt } }
        const t = data.task || data;
        setState((prev) => ({
          ...prev,
          tasks: [{
            id: t.id || `task_${Date.now()}`,
            title: t.title || 'Untitled',
            agentId: t.assignedTo || t.agentId || 'unknown',
            status: "created" as const,
            timestamp: Date.now(),
          }, ...prev.tasks].slice(0, 100),
        }));
      });

      room.onMessage("task:completed", (data: any) => {
        // Server sends { type, task: { id, title, assignedTo, status, outputPath, completedAt } }
        const t = data.task || data;
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) =>
            task.id === t.id
              ? { ...task, status: "completed" as const, outputPath: t.outputPath || t.output || undefined }
              : task
          ),
        }));
      });

      room.onLeave(() => {
        setState((prev) => ({ ...prev, connected: false }));
        roomRef.current = null;
        // Reconnect after 3s
        setTimeout(connect, 3000);
      });
    } catch {
      // Server offline — retry after 5s
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
