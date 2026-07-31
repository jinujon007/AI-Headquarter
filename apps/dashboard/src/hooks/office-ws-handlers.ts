/**
 * State transitions and outbound bridges for the office WebSocket events —
 * extracted from use-office-ws so the logic is unit-testable without a
 * Colyseus connection.
 */
import type { TaskCreatedPayload, TaskCompletedPayload, TaskFailedPayload } from "@aihq/types";

// Fire-and-forget POST to the local activities API so the home page stats stay current.
export function logActivity(
  type: string,
  description: string,
  status: "success" | "error" | "pending" | "running",
  agent?: string,
) {
  fetch("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, description, status, agent: agent ?? null }),
  }).catch(() => {/* best-effort — never block UI */});
}

// Fire-and-forget POST to the notifications API. Without this the TopBar bell has no
// producer and sits permanently empty — the activity feed records everything, the bell
// only carries the events worth interrupting the CEO for.
// ponytail: notable events only (task done/failed, hire); tool_use is far too noisy.
export function notify(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error",
  link?: string,
) {
  fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, message, type, link }),
  }).catch(() => {/* best-effort — never block UI */});
}

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
