import express from 'express';
import { Server, matchMaker } from 'colyseus';
import { createServer } from 'http';
import { OfficeRoom } from './rooms/OfficeRoom';
import * as os from 'os';
import path from 'path';
import { readFile } from 'fs/promises';

const app = express();
app.use(express.json());
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-llm-provider, x-api-key');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

app.get('/api/agents', (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? room.getAgentList() : []);
});

app.post('/api/agents/hire', (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  if (!room) { res.status(503).json({ ok: false, error: 'No active room.' }); return; }
  const { name, role } = req.body || {};
  if (!name || !role) { res.status(400).json({ ok: false, error: 'name and role required' }); return; }
  const agent = room.hireAgent(name, role);
  res.json({ ok: true, agent });
});

app.post('/api/ceo/message', async (req, res) => {
    const room = OfficeRoom.getActiveRoom();
    if (!room) { 
        res.status(503).json({ ok: false, error: 'No active room.' }); 
        return; 
    }
    const { content } = req.body || {};
    if (!content) { 
        res.status(400).json({ ok: false, error: 'content required' }); 
        return; 
    }
    const provider = req.headers['x-llm-provider'] as string | undefined;
    const apiKey  = req.headers['x-api-key'] as string | undefined;
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Emit function to send SSE events
    const emit = (event: object) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        res.write(data);
    };
    
    try {
        await room.streamCeoMessage(content, provider, apiKey, emit);
        // Send final done event
        emit({ type: 'end' });
    } catch (err) {
        console.error('[SSE] Error in streamCeoMessage:', err);
        emit({ type: 'error', message: 'Internal server error' });
        emit({ type: 'end' });
    }
});

app.get('/api/tasks', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getTaskList() : []);
});

app.get('/api/costs', async (req, res) => {
  const room = OfficeRoom.getActiveRoom();
  res.json(room ? await room.getCosts() : []);
});

app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  res.json({
    cpu: Math.round(os.loadavg()[0] * 100) / 100,
    ram: Math.round(((totalMem - freeMem) / totalMem) * 100),
    disk: 0,
  });
});

app.get('/api/output', async (req, res) => {
  const filePath = (req.query.path as string) || '';
  if (!filePath || filePath.includes('..') || !filePath.replace(/\\/g, '/').startsWith('output/')) {
    res.status(400).json({ ok: false, error: 'Invalid path' });
    return;
  }
  try {
    const absPath = path.join(process.cwd(), filePath);
    const content = await readFile(absPath, 'utf-8');
    res.json({ ok: true, content, path: filePath });
  } catch {
    res.status(404).json({ ok: false, error: 'File not found' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Add /api/health endpoint with Ollama connectivity check
app.get('/api/health', async (req, res) => {
  try {
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
    
    // Fetch models from Ollama with timeout using Promise.race
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ollama request timeout')), 3000)
    );
    
    const fetchPromise = fetch(`${OLLAMA_URL}/api/tags`)
      .then(response => {
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
        return response.json();
      });
    
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    const room = OfficeRoom.getActiveRoom();
    const activeAgents = room ? room.getAgentList().length : 0;
    
    res.json({
      ok: true,
      ollamaConnected: true,
      models: result.models || [],
      activeAgents,
      uptime: process.uptime()
    });
  } catch (error) {
    const room = OfficeRoom.getActiveRoom();
    const activeAgents = room ? room.getAgentList().length : 0;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    res.status(503).json({
      ok: false,
      ollamaConnected: false,
      error: errorMessage,
      activeAgents,
      uptime: process.uptime()
    });
  }
});

const httpServer = createServer(app);
const colyseusServer = new Server({ server: httpServer });
colyseusServer.define('office', OfficeRoom);

const PORT = Number(process.env.PORT || 3001);
colyseusServer.listen(PORT).then(async () => {
  console.log(`[AIHQ Server] Listening on port ${PORT}`);
  // Auto-create the office room so agents start immediately without needing a client connection
  try {
    await matchMaker.createRoom('office', {});
    console.log('[AIHQ Server] Office room initialized — agents online');
  } catch (err) {
    console.error('[AIHQ Server] Failed to auto-create office room:', err);
  }
});
