import { NextRequest, NextResponse } from 'next/server';
import { API } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(API.settings, { cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Server auth key — from env, never from the client
    const serverKey = process.env.AIHQ_SERVER_KEY;
    if (serverKey) headers['x-aihq-key'] = serverKey;
    const res = await fetch(API.settings, { method: 'POST', headers, body: JSON.stringify(body) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
