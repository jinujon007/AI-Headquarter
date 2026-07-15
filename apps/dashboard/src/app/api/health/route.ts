import { NextResponse } from 'next/server';

async function checkUrl(url: string, timeoutMs = 5000): Promise<{ status: 'up' | 'down'; latency: number; httpCode?: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { status: res.ok || res.status < 500 ? 'up' : 'down', latency, httpCode: res.status };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

export async function GET() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';

  const [server, ollama, anthropic] = await Promise.all([
    checkUrl(`${serverUrl}/health`, 3000),
    checkUrl('http://localhost:11434', 2000),
    checkUrl('https://api.anthropic.com', 3000),
  ]);

  const checks = [
    { name: 'AIHQ Server', status: server.status, latency: server.latency, url: serverUrl },
    { name: 'Ollama', status: ollama.status, latency: ollama.latency, url: 'http://localhost:11434' },
    {
      name: 'Anthropic API',
      status: anthropic.status === 'up' || anthropic.httpCode === 401 ? 'up' : anthropic.status,
      latency: anthropic.latency,
      url: 'https://api.anthropic.com',
    },
  ];

  const downCount = checks.filter((c) => c.status === 'down').length;
  const overallStatus = downCount === 0 ? 'healthy' : downCount < checks.length / 2 ? 'degraded' : 'critical';

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
