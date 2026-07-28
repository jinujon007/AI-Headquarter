import request from 'supertest';
import type { Express } from 'express';
import { ToolExecutor } from './tools/ToolExecutor';

// Mock OfficeRoom before index.ts is required — routes return empty responses, no Colyseus needed
jest.mock('./rooms/OfficeRoom', () => ({
  OfficeRoom: { getActiveRoom: jest.fn().mockReturnValue(null) },
}));

// require after mock is registered (avoids ESM hoisting concerns with ts-jest)
const { app } = require('./index') as { app: Express };

describe('API Smoke Tests', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /api/health responds with connectivity shape', async () => {
    const res = await request(app).get('/api/health');
    // 200 when Ollama reachable, 503 when not — both valid in CI
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('ollamaConnected');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/agents returns array', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tasks returns array', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/costs returns cost shape', async () => {
    const res = await request(app).get('/api/costs');
    expect(res.status).toBe(200);
    // Returns {} when no room active, or a costs object when room exists
    expect(typeof res.body).toBe('object');
  });

  it('GET /api/system returns system metrics', async () => {
    const res = await request(app).get('/api/system');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cpu');
    expect(res.body).toHaveProperty('ram');
    expect(res.body).toHaveProperty('disk');
  });

  it('GET /api/output rejects path traversal', async () => {
    const res = await request(app).get('/api/output?path=../../etc/passwd');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('ToolExecutor Python Support', () => {
  const executor = new ToolExecutor();

  it('code_execute supports javascript', async () => {
    const result = await executor.execute('code_execute', { code: '1+1', language: 'javascript' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('2');
  });

  it('code_execute handles python gracefully when python3 not installed', async () => {
    const result = await executor.execute('code_execute', { code: 'print(1+1)', language: 'python' });
    // Should fail gracefully if python3 not installed, or succeed if it is
    if (result.success) {
      expect(result.output).toContain('2');
    } else {
      expect(result.error).toBeTruthy();
    }
  });
});

describe('ToolExecutor write_file path traversal', () => {
  const executor = new ToolExecutor();
  const path = require('path');
  const outputRoot = path.resolve(process.cwd(), 'output');

  it('write_file with traversal extension falls back to .md and stays inside output/', async () => {
    const result = await executor.execute('write_file', {
      content: 'traversal test',
      agentId: 'smoke-test',
      filename: 'evil',
      extension: 'md/../../../evil.js',
    });
    expect(result.success).toBe(true);
    expect(result.output).toMatch(/\.md$/);
    const written = path.resolve(process.cwd(), result.output.replace('File written: ', ''));
    expect(written.startsWith(outputRoot + path.sep)).toBe(true);
    await require('fs/promises').rm(written, { force: true });
  });

  it('write_file with traversal agentId is denied', async () => {
    const result = await executor.execute('write_file', {
      content: 'traversal test',
      agentId: '../../outside',
      filename: 'evil',
      extension: 'md',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('output');
  });
});
