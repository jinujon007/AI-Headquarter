/**
 * E2E demo-path test — the single most valuable test in the repo.
 *
 * Boots the real Express app on an ephemeral port, wires a real OfficeRoom
 * (real SQLite, real TaskManager, real ToolExecutor) with a STUBBED adapter,
 * then drives the flagship flow through POST /api/ceo/message and asserts:
 *   1. SSE events arrive in order: token → done → end
 *   2. delegated tasks complete in SQLite
 *   3. a real output file lands in output/<agentId>/
 *   4. the board wrapup and PA completion report are broadcast
 */
import { app } from './index';
import { OfficeRoom } from './rooms/OfficeRoom';
import { MemoryStore } from './memory/MemoryStore';
import { TaskManager } from './tasks/TaskManager';
import { ToolExecutor } from './tools/ToolExecutor';
import { existsSync, unlinkSync } from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const PA_JSON = '{"reply":"On it. Cleo writes the copy, Dev builds the page.","delegates":["copywriter","dev"]}';
const COPY_OUTPUT = 'Headline: Stop Wasting Food, Start Saving Money.\nSubhead: The B2B platform restaurants trust.';
const DEV_OUTPUT = '<!DOCTYPE html>\n<html><head><style>body{font-family:sans-serif}</style></head><body><h1>Stop Wasting Food</h1></body></html>';
const REPORT_OUTPUT = 'Both deliverables are done — copy and a landing page are in the output folder. Next: review the page.';

function makeAgent(name: string, role: string) {
    return { config: { name, role, capabilities: [] }, currentTask: '' } as any;
}

// Canned adapter: routes on the system prompt so each call in the chain gets
// a realistic response without any live model.
const stubAdapter = {
    complete: jest.fn(async (req: { messages: Array<{ role: string; content: string }> }) => {
        const system = req.messages.find(m => m.role === 'system')?.content || '';
        let content: string;
        if (system.includes('Chief of Staff')) content = PA_JSON;
        else if (system.includes('completion report')) content = REPORT_OUTPUT;
        else if (system.includes('Cleo')) content = COPY_OUTPUT;
        else content = DEV_OUTPUT;
        return { content, usage: { prompt: 100, completion: 50 }, latency: 5 };
    }),
};

describe('E2E demo path — CEO command → delegation → files → report', () => {
    let server: Server;
    let baseUrl: string;
    let room: any;
    let store: MemoryStore;
    const writtenFiles: string[] = [];

    beforeAll(async () => {
        store = new MemoryStore('http://localhost:59999'); // embeddings fail fast + silently
        await store.initialize(':memory:');

        room = Object.create(OfficeRoom.prototype);
        room.coreAgents = new Map([
            ['pa', makeAgent('Alex', 'PA / Orchestrator')],
            ['dev', makeAgent('Dev', 'Developer')],
            ['copywriter', makeAgent('Cleo', 'Copywriter')],
        ]);
        room.state = {
            agents: new Map(
                ['pa', 'dev', 'copywriter'].map(id => [id, { x: 0, y: 0, action: 'idle', currentTask: '' }])
            ),
        };
        room.broadcast = jest.fn();
        room.ceoHistory = [];
        room.pendingBatchTasks = new Map();
        room.batchIdCounter = 0;
        room.thinkingLocks = new Map();
        room.sessionId = 'e2e-session';
        room.memoryStore = store;
        room.taskManager = new TaskManager(store);
        room.toolExecutor = new ToolExecutor();
        room.llmQueue = { run: (fn: () => Promise<unknown>) => fn() };
        room.getAdapter = () => stubAdapter;
        // Class-field initializers are skipped by Object.create — inject the two the flow touches
        room.furnitureTargets = { 'dev-desk': { x: 5, y: 12, type: 'desk' }, 'copywriter-desk': { x: 19, y: 12, type: 'desk' } };
        room.isBoardMeetingActive = false;

        (OfficeRoom as any).activeRoom = room;

        server = app.listen(0);
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        (OfficeRoom as any).activeRoom = null;
        server.close();
        await store.close();
        for (const f of writtenFiles) {
            try { unlinkSync(f); } catch { /* already gone */ }
        }
    });

    it('runs the flagship flow end-to-end', async () => {
        const res = await fetch(`${baseUrl}/api/ceo/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'Build me a landing page for a B2B SaaS that helps restaurants manage food waste' }),
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');

        // 1. SSE events in order
        const body = await res.text();
        const events = body.split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));
        const types = events.map(e => e.type);
        expect(types).toEqual(['token', 'done', 'end']);
        expect(events[0].token).toContain('Cleo writes the copy');

        // 2. Delegated tasks complete in SQLite (they run async after the stream ends)
        let tasks: any[] = [];
        for (let i = 0; i < 100; i++) {
            tasks = await room.taskManager.getTaskList();
            if (tasks.length >= 2 && tasks.every((t: any) => t.status === 'completed')) break;
            await new Promise(r => setTimeout(r, 100));
        }
        expect(tasks.length).toBe(2);
        expect(tasks.every((t: any) => t.status === 'completed')).toBe(true);

        // 3. Real output files on disk
        const paths = tasks.map((t: any) => t.output_path).filter(Boolean);
        expect(paths.length).toBe(2);
        for (const p of paths) {
            expect(existsSync(p)).toBe(true);
            writtenFiles.push(p);
        }
        // Dev's file is HTML because the output starts with <!DOCTYPE html>
        expect(paths.some((p: string) => p.endsWith('.html'))).toBe(true);

        // Wait for the async board wrapup (2s seat animation) + report to broadcast
        const deadline = Date.now() + 8000;
        const calls = () => (room.broadcast as jest.Mock).mock.calls;
        while (Date.now() < deadline) {
            const hasReport = calls().some(([type, msg]: any[]) => type === 'agent:message' && msg.isReport);
            const hasBoardEnded = calls().some(([type]: any[]) => type === 'board:ended');
            if (hasReport && hasBoardEnded) break;
            await new Promise(r => setTimeout(r, 100));
        }

        // 4a. Board wrapup fired with both participants
        const boardStarted = calls().find(([type]: any[]) => type === 'board:started');
        expect(boardStarted).toBeDefined();
        expect(boardStarted[1].participants).toEqual(['copywriter', 'dev']);
        expect(calls().some(([type]: any[]) => type === 'board:ended')).toBe(true);

        // 4b. PA completion report reached the CEO
        const report = calls().find(([type, msg]: any[]) => type === 'agent:message' && msg.isReport);
        expect(report).toBeDefined();
        expect(report[1].targetId).toBe('ceo');
        expect(report[1].message).toContain('deliverables are done');

        // Usage was logged for every LLM call (PA + 2 specialists + report)
        expect(stubAdapter.complete).toHaveBeenCalledTimes(4);
    }, 30000);

    // Regression: hireAgent refuses past the cap by returning { error }, but the
    // endpoint wrapped that in { ok: true }, so the dashboard reported a successful
    // hire for an agent that was never created.
    it('reports a refused hire as a failure, not ok:true', async () => {
        const before = room.hireCount;
        room.hireCount = 6;
        try {
            const res = await fetch(`${baseUrl}/api/agents/hire`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Fiona', role: 'Financial Analyst' }),
            });
            const body = await res.json();
            expect(res.status).toBe(409);
            expect(body.ok).toBe(false);
            expect(body.error).toMatch(/full/i);
        } finally {
            room.hireCount = before;
        }
    });

    it('streams an honest error when the room is gone', async () => {
        (OfficeRoom as any).activeRoom = null;
        const res = await fetch(`${baseUrl}/api/ceo/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'anything' }),
        });
        expect(res.status).toBe(503);
        (OfficeRoom as any).activeRoom = room;
    });
});
