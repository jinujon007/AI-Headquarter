import { NextResponse } from 'next/server';
import { API } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(API.tasks, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
