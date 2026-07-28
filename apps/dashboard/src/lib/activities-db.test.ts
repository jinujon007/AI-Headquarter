import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// activities-db resolves its DB path from process.cwd() at import time —
// chdir to a temp dir BEFORE importing so tests never touch the real DB.
const tmp = mkdtempSync(path.join(tmpdir(), "aihq-activities-"));
const originalCwd = process.cwd();
process.chdir(tmp);

const db = await import("./activities-db");

afterAll(() => {
  process.chdir(originalCwd);
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* windows file locks */ }
});

describe("activities-db", () => {
  beforeAll(() => {
    db.clearActivities();
  });

  it("logActivity + getActivities round-trips", () => {
    const logged = db.logActivity("task", "Completed: landing page", "success", {
      agent: "dev",
      metadata: { taskId: "task_1" },
    });
    expect(logged.id).toBeTruthy();

    const { activities, total } = db.getActivities();
    expect(total).toBe(1);
    expect(activities[0]).toMatchObject({
      type: "task",
      description: "Completed: landing page",
      status: "success",
      agent: "dev",
      metadata: { taskId: "task_1" },
    });
  });

  it("filters by status", () => {
    db.logActivity("task", "Failed: budget reached", "error", { agent: "dev" });
    const errors = db.getActivities({ status: "error" });
    expect(errors.total).toBe(1);
    expect(errors.activities[0].status).toBe("error");
  });

  it("updateActivity changes status in place", () => {
    const a = db.logActivity("task", "Long build", "running");
    db.updateActivity(a.id, "success", { duration_ms: 1234 });
    const { activities } = db.getActivities({ status: "success" });
    const updated = activities.find((x) => x.id === a.id);
    expect(updated).toMatchObject({ status: "success", duration_ms: 1234 });
  });

  it("getActivityStats counts totals and by-status", () => {
    const stats = db.getActivityStats();
    expect(stats.total).toBe(3);
    expect(stats.byStatus.error).toBe(1);
  });

  it("clearActivities empties the log", () => {
    expect(db.clearActivities()).toBeGreaterThan(0);
    expect(db.getActivities().total).toBe(0);
  });
});
