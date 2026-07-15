import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { API } from "@/lib/paths";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '30d';
    const res = await fetch(`${API.costs}?timeframe=${timeframe}`, { cache: 'no-store' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}

// ponytail: no POST — nothing in the UI sends budget/alert settings; the old
// handler returned success without persisting anything. Add real persistence
// when a settings form actually exists.