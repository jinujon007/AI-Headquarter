import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const serverKey = process.env.AIHQ_SERVER_KEY;
    if (serverKey) forwardHeaders['x-aihq-key'] = serverKey;
    const res = await fetch(API.agentsHire, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    // Propagate the upstream status — a proxy that turns a 409 into a 200 lies at
    // the HTTP layer, even when the body still carries ok:false.
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
