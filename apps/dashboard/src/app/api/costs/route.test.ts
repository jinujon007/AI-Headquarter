import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const makeReq = () => new NextRequest("http://localhost:3000/api/costs?timeframe=30d");

afterEach(() => vi.restoreAllMocks());

describe("GET /api/costs proxy", () => {
  it("passes the server payload through", async () => {
    const payload = { today: 0.5, thisMonth: 2, budget: 10, byAgent: [], byModel: [], daily: [], hourly: [] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload))));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body).toMatchObject({ today: 0.5, thisMonth: 2, budget: 10 });
  });

  it("returns [] when the server is unreachable (UI shows empty state, not a crash)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
