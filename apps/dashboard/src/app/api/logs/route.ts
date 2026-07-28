import { NextResponse } from "next/server";
import { API } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Proxy for the server's in-memory log ring buffer (last 500 console lines).
export async function GET() {
  try {
    const res = await fetch(API.logs, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
