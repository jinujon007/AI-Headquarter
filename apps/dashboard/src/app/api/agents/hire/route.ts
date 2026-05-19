import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(API.agentsHire, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Server unreachable' }, { status: 503 });
  }
}
