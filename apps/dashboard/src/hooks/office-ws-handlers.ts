/**
 * Pure state transitions for the office WebSocket events — extracted from
 * use-office-ws so the logic is unit-testable without a Colyseus connection.
 */
import type { TaskCreatedPayload, TaskCompletedPayload, TaskFailedPayload } from "@aihq/types";

export interface TaskEvent {
  id: string;
  title: string;
  agentId: string;
  status: "created" | "completed" | "failed";
  output?: string;
  outputPath?: string;
  error?: string;
  timestamp: number;
}

export function applyTaskCreated(tasks: TaskEvent[], data: TaskCreatedPayload, now: number): TaskEvent[] {
  const t = (data.task || data) as TaskCreatedPayload["task"] & { agentId?: string };
  return [{
    id: t.id || `task_${now}`,
    title: t.title || "Untitled",
    agentId: t.assignedTo || t.agentId || "unknown",
    status: "created" as const,
    timestamp: now,
  }, ...tasks].slice(0, 100);
}

export function applyTaskCompleted(tasks: TaskEvent[], data: TaskCompletedPayload): TaskEvent[] {
  const t = (data.task || data) as TaskCompletedPayload["task"] & { agentId?: string; output?: string };
  return tasks.map((task) =>
    task.id === t.id
      ? { ...task, status: "completed" as const, outputPath: t.outputPath || t.output || undefined }
      : task
  );
}

export function applyTaskFailed(tasks: TaskEvent[], data: TaskFailedPayload): TaskEvent[] {
  const t = (data.task || data) as TaskFailedPayload["task"] & { agentId?: string };
  return tasks.map((task) =>
    task.id === t.id
      ? { ...task, status: "failed" as const, error: t.error }
      : task
  );
}

export function mapSyncTasks(
  tasks: Array<{ id: number; title: string; assignedTo: string; status: string }>,
  now: number,
): TaskEvent[] {
  return tasks.map((t) => ({
    id: `task_${t.id}`,
    title: t.title || "Untitled",
    agentId: t.assignedTo || "unknown",
    status: t.status === "completed" ? ("completed" as const)
      : t.status === "failed" ? ("failed" as const)
      : ("created" as const),
    timestamp: now,
  })).slice(0, 100);
}
