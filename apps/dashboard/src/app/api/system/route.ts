import { NextResponse } from 'next/server';
import os from 'os';
import { clearActivities } from '@/lib/activities-db';

export const dynamic = 'force-dynamic';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(seconds)}s`);
  return parts.join(' ');
}

export async function GET() {
  const uptime = process.uptime();

  return NextResponse.json({
    agent: {
      name: process.env.NEXT_PUBLIC_AGENT_NAME || "Alex",
      creature: "AI Chief of Staff",
      emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || "🤖",
    },
    system: {
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      nodeVersion: process.version,
      model: process.env.OLLAMA_MODEL || "ollama/llama3.2",
      workspacePath: process.cwd(),
      platform: os.platform(),
      hostname: os.hostname(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
    },
    integrations: [],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    if (action === 'clear_activity_log') {
      const deleted = clearActivities();
      return NextResponse.json({ success: true, message: `Activity log cleared (${deleted} entries)` });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
