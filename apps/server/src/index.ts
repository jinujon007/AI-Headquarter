import './env'; // must run before anything reads process.env
import express, { Request, Response, NextFunction } from 'express';
import { Server, matchMaker } from 'colyseus';
import { createServer } from 'http';
import { OfficeRoom } from './rooms/OfficeRoom';
import * as os from 'os';
import path from 'path';
import { readFile, realpath } from 'fs/promises';

// ─── RATE LIMITER ────────────────────────────────────────────────────────────
interface RateLimitEntry { count: number; resetTime: number; }
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}, 5 * 60_000).unref();

// Reads are cheap and the UI makes them in bursts — opening six task outputs in a
// row is normal use, not abuse. Only the expensive paths (LLM calls, hiring,
// settings writes) get the strict budget.
const READ_RATE_LIMIT = 60;

function checkRateLimit(clientId: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// req.ip is already proxy-aware via app.set('trust proxy', 1) — never trust
// X-Forwarded-For directly, it is spoofable when the server is exposed raw.
function makeRateLimiter(limit: number, bucket: string) {
  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    // Separate bucket per tier, so a burst of cheap reads cannot exhaust the
    // allowance for CEO messages (and vice versa).
    const { allowed, remaining } = checkRateLimit(`${bucket}:${req.ip || 'unknown'}`, limit);
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    if (!allowed) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Wait before trying again.' });
      return;
    }
    next();
  };
}

const rateLimiter = makeRateLimiter(RATE_LIMIT, 'write');
const readRateLimiter = makeRateLimiter(READ_RATE_LIMIT, 'read');

// ─── LOG RING BUFFER ─────────────────────────────────────────────────────────
// Last 500 console lines, served at GET /api/logs — the dashboard Live Logs
// page reads this. Works on every install (no pm2/journalctl assumptions).
const LOG_BUFFER_MAX = 500;
const logBuffer: { ts: string; level: string; line: string }[] = [];
for (const level of ['log', 'warn', 'error'] as const) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    try {
      const line = args
        .map(a => typeof a === 'string' ? a : a instanceof Error ? `${a.message}` : JSON.stringify(a))
        .join(' ');
      // Sanitise at the choke point. Agent names, model errors and CEO text all reach
      // this buffer, and /api/logs serves it straight to the dashboard — a newline in
      // any of them would forge extra log entries. One guard here covers every caller.
      const safe = line.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '');
      logBuffer.push({ ts: new Date().toISOString(), level, line: safe.slice(0, 500) });
      if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
    } catch { /* never let logging break the app */ }
    orig(...args);
  };
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const app = express();

// Trust first proxy hop so req.ip is correct behind nginx/Railway/Fly
app.set('trust proxy', 1);

app.use(express.json({ limit: '64kb' }));

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-llm-provider, x-api-key, x-aihq-key');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ─── OPTIONAL SERVER KEY AUTH ────────────────────────────────────────────────
// When AIHQ_SERVER_KEY is set in env, mutating endpoints require the header.
// Leave AIHQ_SERVER_KEY unset for local dev — open mode.
function requireServerKey(req: Request, res: Response, next: NextFunction) {
  const serverKey = process.env.AIHQ_SERVER_KEY;
  if (!serverKey) { next(); return; }
  if (req.headers['x-aihq-key'] !== serverKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  next();
}

// True when `target` is the directory `root` itself or something beneath it.
// Compared on resolved absolute paths — never on the raw request string.
function isInside(target: string, root: string): boolean {
  return target === root || target.startsWith(root + path.sep);
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/health', async (_req, res) => {
  try {
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    const fetchPromise = fetch(`${OLLAMA_URL}/api/tags`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
    const room = OfficeRoom.getActiveRoom();
    res.json({ ok: true, ollamaConnected: true, models: result.models || [], activeAgents: room ? room.getAgentList().length : 0, uptime: process.uptime() });
  } catch (error) {
    const room = OfficeRoom.getActiveRoom();
    res.status(503).json({ ok: false, ollamaConnected: false, error: error instanceof Error ? error.message : String(error), activeAgents: room ? room.getAgentList().length : 0, uptime: process.uptime() });
  }
});

app.get('/api/agents', (_req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? room.getAgentList() : []);
});

app.post('/api/agents/hire', requireServerKey, rateLimiter, async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) { res.status(503).json({ ok: false, error: 'No active room.' }); return; }
  const { name, role } = req.body || {};
  if (!name || !role) { res.status(400).json({ ok: false, error: 'name and role required' }); return; }
  if (typeof name !== 'string' || name.length > 50) {
    res.status(400).json({ ok: false, error: 'name must be a string under 50 characters' }); return;
  }
  if (typeof role !== 'string' || role.length > 100) {
    res.status(400).json({ ok: false, error: 'role must be a string under 100 characters' }); return;
  }
  const provider = req.headers['x-llm-provider'] as string | undefined;
  const apiKey   = req.headers['x-api-key']     as string | undefined;
  const agent = await room.hireAgent(name, role, provider, apiKey);
  // hireAgent refuses by returning { error, code }. Reporting that as ok:true made the
  // dashboard show a successful hire for an agent that never existed.
  // 409 = office is full (a client-side conflict); 502 = the agent could not initialize
  // because the model provider was unreachable (an upstream failure).
  if (agent?.error) {
    res.status(agent.code === 'office_full' ? 409 : 502).json({ ok: false, error: agent.error });
    return;
  }
  res.json({ ok: true, agent });
});

app.post('/api/ceo/message', requireServerKey, rateLimiter, async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) { res.status(503).json({ ok: false, error: 'No active room.' }); return; }
  const { content } = req.body || {};
  if (!content) { res.status(400).json({ ok: false, error: 'content required' }); return; }
  if (typeof content !== 'string' || content.length > 8000) {
    res.status(400).json({ ok: false, error: 'content must be a string under 8000 characters' }); return;
  }

  const provider = req.headers['x-llm-provider'] as string | undefined;
  const apiKey   = req.headers['x-api-key']     as string | undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    await room.streamCeoMessage(content, provider, apiKey, emit);
    emit({ type: 'end' });
  } catch (err) {
    console.error('[SSE] streamCeoMessage error:', err);
    emit({ type: 'error', message: 'Internal server error' });
    emit({ type: 'end' });
  } finally {
    res.end();
  }
});

app.get('/api/tasks', async (_req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getTaskList() : []);
});

app.get('/api/costs', async (_req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getCosts() : {});
});

app.get('/api/logs', (_req, res) => {
  res.json(logBuffer);
});

app.get('/api/settings', async (_req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) { res.status(503).json({ ok: false, error: 'No active room.' }); return; }
  res.json({ ok: true, ...(await room.getSettings()) });
});

app.post('/api/settings', requireServerKey, rateLimiter, async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) { res.status(503).json({ ok: false, error: 'No active room.' }); return; }
  const { budgetUsd } = req.body || {};
  if (budgetUsd !== null && (typeof budgetUsd !== 'number' || !Number.isFinite(budgetUsd) || budgetUsd < 0)) {
    res.status(400).json({ ok: false, error: 'budgetUsd must be a non-negative number or null' }); return;
  }
  await room.setBudgetUsd(budgetUsd);
  res.json({ ok: true, ...(await room.getSettings()) });
});

app.get('/api/system', (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  res.json({ cpu: Math.round(os.loadavg()[0] * 100) / 100, ram: Math.round(((totalMem - freeMem) / totalMem) * 100), disk: 0 });
});

// Rate-limited: this reads files off disk, so it should not be a free scraping loop.
app.get('/api/output', readRateLimiter, async (req, res) => {
  const filePath = (req.query.path as string) || '';
  if (!filePath) { res.status(400).json({ ok: false, error: 'Invalid path' }); return; }
  try {
    const allowedRoot = path.resolve(process.cwd(), 'output');
    const resolved    = path.resolve(process.cwd(), filePath);
    // Two-stage containment. path.resolve() collapses ../ but does NOT follow symlinks,
    // so a link inside output/ pointing anywhere on disk would pass a resolve-only check
    // and then be read. realpath() resolves the link; we re-check the real location and
    // compare against the real root (the root itself may sit behind a symlink too).
    if (!isInside(resolved, allowedRoot)) {
      res.status(400).json({ ok: false, error: 'Invalid path' }); return;
    }
    const [realRoot, realTarget] = await Promise.all([realpath(allowedRoot), realpath(resolved)]);
    if (!isInside(realTarget, realRoot)) {
      res.status(400).json({ ok: false, error: 'Invalid path' }); return;
    }
    const content = await readFile(realTarget, 'utf-8');
    res.json({ ok: true, content, path: filePath });
  } catch {
    res.status(404).json({ ok: false, error: 'File not found' });
  }
});

export { app };

if (require.main === module) {
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.warn('[AIHQ Server] Railway detected: local Ollama may be unavailable. Configure BYOK provider/API key in dashboard settings.');
  }

  const httpServer = createServer(app);
  const colyseusServer = new Server({ server: httpServer });
  colyseusServer.define('office', OfficeRoom);

  const PORT = Number(process.env.PORT || 3001);
  colyseusServer.listen(PORT).then(async () => {
    console.log(`[AIHQ Server] Listening on port ${PORT}`);
    try {
      await matchMaker.createRoom('office', {});
      console.log('[AIHQ Server] Office room initialized — agents online');
    } catch (err) {
      console.error('[AIHQ Server] Failed to auto-create office room:', err);
    }
  });

  // ─── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────
  // Ensures SQLite is flushed and Colyseus rooms are disposed on Docker stop / Railway restart.
  const shutdown = async (signal: string) => {
    console.log(`[AIHQ Server] ${signal} received — shutting down gracefully`);
    const room = OfficeRoom.getActiveRoom();
    if (room) {
      try { await room.disconnect(); } catch { /* ignore */ }
    }
    httpServer.close(() => {
      console.log('[AIHQ Server] HTTP server closed');
      process.exit(0);
    });
    // Force-exit after 10 s if something hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}
