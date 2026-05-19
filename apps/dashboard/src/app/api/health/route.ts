/**
 * Health check endpoint
 * GET /api/health - Check health of all services and integrations
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceCheck {
  name: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  latency?: number;
  details?: string;
  url?: string;
}

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

async function checkSystemdService(name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${name} 2>/dev/null`);
    const active = stdout.trim() === 'active';
    return { name, status: active ? 'up' : 'down', details: stdout.trim() };
  } catch {
    return { name, status: 'down', details: 'service not found' };
  }
}

async function checkPm2Service(name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync('pm2 jlist 2>/dev/null');
    const list = JSON.parse(stdout);
    const proc = list.find((p: { name: string }) => p.name === name);
    if (!proc) return { name, status: 'unknown', details: 'not found in pm2' };
    const status = proc.pm2_env?.status === 'online' ? 'up' : 'down';
    return { name, status, details: `${proc.pm2_env?.status} Â· restarts: ${proc.pm2_env?.restart_time}` };
  } catch {
    return { name, status: 'unknown', details: 'pm2 not available' };
  }
}

export async function GET() {
  const checks: ServiceCheck[] = [];

  // Internal services
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
  const [server, ollama, anthropic] = await Promise.all([
    checkUrl(`${serverUrl}/health`, 3000),
    checkUrl('http://localhost:11434', 2000),
    checkUrl('https://api.anthropic.com', 3000),
  ]);

  checks.push({ name: 'AIHQ Server', status: server.status, latency: server.latency, url: serverUrl });
  checks.push({ name: 'Ollama', status: ollama.status, latency: ollama.latency, url: 'http://localhost:11434' });
  checks.push({
    name: 'Anthropic API',
    status: anthropic.status === 'up' || (anthropic as { httpCode?: number }).httpCode === 401 ? 'up' : anthropic.status,
    latency: anthropic.latency,
    url: 'https://api.anthropic.com',
  });

  // Overall status
  const downCount = checks.filter((c) => c.status === 'down').length;
  const overallStatus = downCount === 0 ? 'healthy' : downCount < checks.length / 2 ? 'degraded' : 'critical';

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

