import { describe, it, expect, vi, afterEach } from "vitest";
import { applyTaskCreated, applyTaskCompleted, applyTaskFailed, mapSyncTasks, logActivity, notify, type TaskEvent } from "./office-ws-handlers";

afterEach(() => vi.restoreAllMocks());

// Regression: the TopBar bell polls /api/notifications every 30s but nothing ever
// POSTed to it, so it was permanently empty. These assert both bridges still fire.
describe("outbound event bridges", () => {
  it("notify POSTs a well-formed notification", () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    notify("Task completed", "Write copy", "success", "/tasks");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/notifications");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      title: "Task completed",
      message: "Write copy",
      type: "success",
      link: "/tasks",
    });
  });

  it("logActivity POSTs to the activities API with a null agent when omitted", () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    logActivity("agent_hired", "New agent hired: Fin (financial analyst)", "success");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/activities");
    expect(JSON.parse(init.body as string).agent).toBeNull();
  });

  it("a rejected fetch never throws — the UI must not break on a dead API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    expect(() => notify("t", "m", "error")).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});

const NOW = 1700000000000;

describe("office-ws task handlers", () => {
  it("task:created prepends with assignedTo, caps at 100", () => {
    const payload = {
      type: "task:created",
      task: { id: "task_9", title: "Write copy", assignedTo: "copywriter", status: "in-progress", createdAt: "" },
    } as never;
    const existing: TaskEvent[] = Array.from({ length: 100 }, (_, i) => ({
      id: `old_${i}`, title: "x", agentId: "dev", status: "created" as const, timestamp: NOW,
    }));
    const out = applyTaskCreated(existing, payload, NOW);
    expect(out).toHaveLength(100);
    expect(out[0]).toMatchObject({ id: "task_9", agentId: "copywriter", status: "created" });
  });

  it("task:completed sets status + outputPath on the matching task only", () => {
    const tasks: TaskEvent[] = [
      { id: "task_1", title: "a", agentId: "dev", status: "created", timestamp: NOW },
      { id: "task_2", title: "b", agentId: "researcher", status: "created", timestamp: NOW },
    ];
    const payload = {
      type: "task:completed",
      task: { id: "task_1", title: "a", assignedTo: "dev", status: "completed", outputPath: "output/dev/x.html", completedAt: "" },
    } as never;
    const out = applyTaskCompleted(tasks, payload);
    expect(out[0]).toMatchObject({ status: "completed", outputPath: "output/dev/x.html" });
    expect(out[1].status).toBe("created");
  });

  it("task:failed records the error", () => {
    const tasks: TaskEvent[] = [{ id: "task_1", title: "a", agentId: "dev", status: "created", timestamp: NOW }];
    const payload = {
      type: "task:failed",
      task: { id: "task_1", title: "a", assignedTo: "dev", status: "failed", error: "Monthly budget $5 reached" },
    } as never;
    const out = applyTaskFailed(tasks, payload);
    expect(out[0]).toMatchObject({ status: "failed", error: "Monthly budget $5 reached" });
  });

  it("tasks-sync maps DB statuses to UI statuses", () => {
    const out = mapSyncTasks([
      { id: 1, title: "done", assignedTo: "dev", status: "completed" },
      { id: 2, title: "broken", assignedTo: "", status: "failed" },
      { id: 3, title: "running", assignedTo: "researcher", status: "pending" },
    ], NOW);
    expect(out.map(t => t.status)).toEqual(["completed", "failed", "created"]);
    expect(out[1].agentId).toBe("unknown");
    expect(out[0].id).toBe("task_1");
  });
});
