import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const makeReq = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/agents/hire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

afterEach(() => vi.restoreAllMocks());

describe("POST /api/agents/hire proxy", () => {
  // Regression: this returned NextResponse.json(body) with no status, so a 409
  // "office full" from the server reached the browser as a 200.
  it("propagates a refusal status instead of flattening it to 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: "Office full (max 11 agents)" }), { status: 409 })));

    const res = await POST(makeReq({ name: "Fiona", role: "Financial Analyst" }));
    expect(res.status).toBe(409);
    expect((await res.json()).ok).toBe(false);
  });

  it("passes a successful hire through as 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, agent: { id: "hire_0" } }), { status: 200 })));

    const res = await POST(makeReq({ name: "Fiona", role: "Financial Analyst" }));
    expect(res.status).toBe(200);
    expect((await res.json()).agent.id).toBe("hire_0");
  });

  it("reports 503 when the server is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));

    const res = await POST(makeReq({ name: "Fiona", role: "Analyst" }));
    expect(res.status).toBe(503);
  });
});
