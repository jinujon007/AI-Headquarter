import { NextRequest } from 'next/server';
import { API } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const provider = request.headers.get('x-llm-provider');
    const apiKey = request.headers.get('x-api-key');
    if (provider) forwardHeaders['x-llm-provider'] = provider;
    if (apiKey) forwardHeaders['x-api-key'] = apiKey;

    const res = await fetch(API.ceoMessage, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok || !res.body) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', message: 'Server unreachable' })}\n\n`,
        { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Server unreachable' })}\n\n`,
      { status: 503, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
