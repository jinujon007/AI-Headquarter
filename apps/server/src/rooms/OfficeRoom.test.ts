import { OfficeRoom, buildTeamContext, normalizeDeliverable } from './OfficeRoom';

// ponytail: no Colyseus boot — Object.create skips the Room/MemoryStore constructors,
// we inject only the private fields each method actually touches. Full-room integration
// tests can come later if the delegation surface grows.

function makeAgent(name: string, role = 'Specialist') {
    return { config: { name, role, capabilities: [] }, currentTask: '' } as any;
}

function makeRoom(agents: Record<string, string> = {
    pa: 'Alex', dev: 'Dev', researcher: 'Ray', copywriter: 'Cleo', analyst: 'Max',
}) {
    const room: any = Object.create(OfficeRoom.prototype);
    room.coreAgents = new Map(Object.entries(agents).map(([id, name]) => [id, makeAgent(name)]));
    room.state = {
        agents: new Map(Object.keys(agents).map(id => [id, { x: 0, y: 0, action: 'idle', currentTask: '' }])),
    };
    room.broadcast = jest.fn();
    room.ceoHistory = [];
    room.pendingBatchTasks = new Map();
    room.batchIdCounter = 0;
    room.thinkingLocks = new Map();
    room.sessionId = 'test-session';
    room.memoryStore = {
        saveMemory: jest.fn().mockResolvedValue(undefined),
        logUsage: jest.fn().mockResolvedValue(undefined),
        getBudgetUsd: jest.fn().mockResolvedValue(null),
        getMonthToDateSpend: jest.fn().mockResolvedValue(0),
        getAvgTokensPerCall: jest.fn().mockResolvedValue(null),
    };
    room.taskManager = { createTask: jest.fn().mockResolvedValue(1) };
    room.llmQueue = { run: (fn: () => Promise<any>) => fn() };
    return room;
}

describe('normalizeDelegates', () => {
    it('resolves agent names to ids', () => {
        const room = makeRoom();
        expect(room.normalizeDelegates(['Ray', 'Cleo', 'Dev'])).toEqual(['researcher', 'copywriter', 'dev']);
    });

    it('resolves ids regardless of casing and whitespace', () => {
        const room = makeRoom();
        expect(room.normalizeDelegates(['DEV', ' Researcher ', 'ANALYST'])).toEqual(['dev', 'researcher', 'analyst']);
    });

    it('drops invalid entries and never resolves the PA', () => {
        const room = makeRoom();
        expect(room.normalizeDelegates(['bogus', 'pa', 'Alex', 'ray'])).toEqual(['researcher']);
    });

    it('dedupes name+id spellings of the same agent', () => {
        const room = makeRoom();
        expect(room.normalizeDelegates(['ray', 'Researcher'])).toEqual(['researcher']);
    });

    it('resolves hired agents from the live roster', () => {
        const room = makeRoom({ pa: 'Alex', dev: 'Dev', hire_0: 'Fiona' });
        expect(room.normalizeDelegates(['Fiona', 'HIRE_0'])).toEqual(['hire_0']);
    });
});

describe('parseStructuredResponse', () => {
    it('parses clean JSON and normalizes delegates', () => {
        const room = makeRoom();
        const out = room.parseStructuredResponse('{"reply":"On it, boss.","delegates":["Ray","Cleo"]}');
        expect(out).toEqual({ reply: 'On it, boss.', delegates: ['researcher', 'copywriter'] });
    });

    it('extracts JSON surrounded by prose', () => {
        const room = makeRoom();
        const raw = 'Sure! Here is my plan: {"reply":"Delegating now.","delegates":["dev","BOGUS"]} hope that helps';
        const out = room.parseStructuredResponse(raw);
        expect(out).toEqual({ reply: 'Delegating now.', delegates: ['dev'] });
    });

    it('filters non-string delegate entries', () => {
        const room = makeRoom();
        const out = room.parseStructuredResponse('{"reply":"ok","delegates":[1,null,"Max"]}');
        expect(out).toEqual({ reply: 'ok', delegates: ['analyst'] });
    });

    it('falls back to substring matching when braces contain broken JSON', () => {
        const room = makeRoom();
        const raw = 'I will ask Ray and Cleo to handle {this} right away.';
        const out = room.parseStructuredResponse(raw);
        expect(out.reply).toBe(raw);
        expect(out.delegates).toEqual(['researcher', 'copywriter']);
    });

    it('returns null for garbage with no JSON at all (caller streams raw text, no delegation)', () => {
        const room = makeRoom();
        expect(room.parseStructuredResponse('total nonsense with zero braces in it')).toBeNull();
    });

    it('honors delegates when JSON lacks a reply string, with a synthesized reply', () => {
        const room = makeRoom();
        const out = room.parseStructuredResponse('{"delegates":["dev"]}');
        expect(out.delegates).toEqual(['dev']);
        expect(out.reply).toBe('On it — delegating to the team now.');
    });

    it('honors hire when the model omits the reply field (live llama3.2:3b behavior)', () => {
        const room = makeRoom();
        const out = room.parseStructuredResponse('{\n  "hire": {"name": "Zoe", "role": "Data Scientist"}\n}');
        expect(out.hire).toEqual({ name: 'Zoe', role: 'Data Scientist' });
        expect(out.reply).toContain('Zoe joins as our Data Scientist');
        expect(out.delegates).toEqual([]);
    });
});

describe('parseStructuredResponse — truncated JSON from small local models', () => {
    it('repairs JSON missing its closing brace (live run-1 failure shape)', () => {
        const room = makeRoom();
        const raw = '{\n  "reply": "Our team is excited to launch the page.",\n  "delegates": ["dev", "copywriter"]';
        const out = room.parseStructuredResponse(raw);
        expect(out.reply).toBe('Our team is excited to launch the page.');
        expect(out.delegates).toEqual(['dev', 'copywriter']);
    });

    it('repairs JSON with an unterminated string', () => {
        const room = makeRoom();
        const raw = '{"reply": "Working on it';
        const out = room.parseStructuredResponse(raw);
        expect(out.reply).toBe('Working on it');
    });

    it('never leaks raw JSON debris to the CEO chat', () => {
        const room = makeRoom();
        // Unsalvageable JSON-ish garbage — reply must be a clean sentence, not braces
        const out = room.parseStructuredResponse('{"rep__garbage: [[[');
        expect(out.reply.trimStart().startsWith('{')).toBe(false);
    });
});

describe('delegate', () => {
    it('sizes the batch from validated delegates only', async () => {
        const room = makeRoom();
        room.runSpecialistTask = jest.fn();
        await room.delegate('build a landing page', ['dev', 'ghost', 'researcher'], undefined, undefined);

        expect(room.pendingBatchTasks.size).toBe(1);
        const batch = [...room.pendingBatchTasks.values()][0] as any;
        expect(batch.total).toBe(2);
        expect(batch.participants).toEqual(['dev', 'researcher']);
        expect(room.taskManager.createTask).toHaveBeenCalledTimes(2);
        expect(room.runSpecialistTask).toHaveBeenCalledTimes(2);
        // thinking lock held while the task runs
        expect(room.thinkingLocks.get('dev')).toBe(true);
        expect(room.thinkingLocks.get('researcher')).toBe(true);
    });

    it('creates no batch and no tasks when no delegate is valid', async () => {
        const room = makeRoom();
        room.runSpecialistTask = jest.fn();
        await room.delegate('hello', ['ghost', 'pa-typo'], undefined, undefined);

        expect(room.pendingBatchTasks.size).toBe(0);
        expect(room.taskManager.createTask).not.toHaveBeenCalled();
        expect(room.runSpecialistTask).not.toHaveBeenCalled();
    });
});

describe('streamCeoMessage', () => {
    it('emits the parsed reply and delegates normalized ids on success', async () => {
        const room = makeRoom();
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '{"reply":"Putting Ray and Dev on it.","delegates":["Ray","DEV","nobody"]}',
                usage: { prompt: 10, completion: 5 },
            }),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        const emit = jest.fn();

        await room.streamCeoMessage('research the market', undefined, undefined, emit);

        expect(emit).toHaveBeenCalledWith({ type: 'token', agentId: 'pa', token: 'Putting Ray and Dev on it.' });
        expect(emit).toHaveBeenCalledWith({ type: 'done', agentId: 'pa' });
        expect(room.delegate).toHaveBeenCalledWith('research the market', ['researcher', 'dev'], undefined, undefined);
        expect(room.memoryStore.logUsage).toHaveBeenCalled();
    });

    it('emits an honest error when the adapter is unreachable', async () => {
        const room = makeRoom();
        room.getAdapter = () => ({
            complete: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        const emit = jest.fn();

        await room.streamCeoMessage('do something', undefined, undefined, emit);

        const honest = 'Could not reach the model — check that Ollama is running, or configure an API key in Settings.';
        expect(emit).toHaveBeenCalledWith({ type: 'token', agentId: 'pa', token: honest });
        expect(emit).toHaveBeenCalledWith({ type: 'done', agentId: 'pa' });
        // no fake delegation — empty delegate list
        expect(room.delegate).toHaveBeenCalledWith('do something', [], undefined, undefined);
        // the honest message (not a fake "delegating" line) reaches the office chat
        expect(room.broadcast).toHaveBeenCalledWith('agent:message',
            expect.objectContaining({ agentId: 'pa', message: honest, targetId: 'ceo' }));
    }, 15000); // withRetry sleeps ~3s across its 3 attempts

    it('refuses a BYOK run when the monthly budget is reached — no LLM call, no delegation', async () => {
        const room = makeRoom();
        room.memoryStore.getBudgetUsd = jest.fn().mockResolvedValue(0.01);
        room.memoryStore.getMonthToDateSpend = jest.fn().mockResolvedValue(5);
        const complete = jest.fn();
        room.getAdapter = () => ({ complete });
        room.delegate = jest.fn();
        const emit = jest.fn();

        await room.streamCeoMessage('build something', 'anthropic', 'sk-test', emit);

        expect(complete).not.toHaveBeenCalled();
        expect(room.delegate).not.toHaveBeenCalled();
        const tokenCall = emit.mock.calls.find((c: any[]) => c[0].type === 'token');
        expect(tokenCall[0].token).toContain('Monthly budget $0.01 reached');
        expect(emit).toHaveBeenCalledWith({ type: 'done', agentId: 'pa' });
    });

    it('appends a cost estimate to the PA reply for BYOK delegations', async () => {
        const room = makeRoom();
        room.memoryStore.getAvgTokensPerCall = jest.fn().mockResolvedValue({ prompt: 2000, completion: 1000 });
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '{"reply":"On it.","delegates":["dev"]}',
                usage: { prompt: 10, completion: 5 },
            }),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        const emit = jest.fn();

        await room.streamCeoMessage('build a page', 'anthropic', 'sk-test', emit);

        const tokenCall = emit.mock.calls.find((c: any[]) => c[0].type === 'token');
        // claude default model: 1 delegate × (2000×$3 + 1000×$15)/1M = $0.021 → rendered with 2 decimals
        expect(tokenCall[0].token).toMatch(/Estimated cost for this run: ~\$0\.02/);
    });

    it('hires a new agent when the PA returns a hire field', async () => {
        const room = makeRoom();
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '{"reply":"Done — Fiona joins as Financial Analyst.","delegates":[],"hire":{"name":"Fiona","role":"Financial Analyst"}}',
                usage: { prompt: 10, completion: 5 },
            }),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        room.hireAgent = jest.fn().mockReturnValue({ id: 'hire_0', name: 'Fiona', role: 'Financial Analyst' });
        const emit = jest.fn();

        await room.streamCeoMessage('hire a financial analyst', undefined, undefined, emit);

        expect(room.hireAgent).toHaveBeenCalledWith('Fiona', 'Financial Analyst', undefined, undefined);
        const tokenCall = emit.mock.calls.find((c: any[]) => c[0].type === 'token');
        expect(tokenCall[0].token).toContain('Fiona joins');
    });

    it('does not hire when the hire field is absent or malformed', async () => {
        const room = makeRoom();
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '{"reply":"On it.","delegates":["dev"],"hire":{"name":123}}',
                usage: { prompt: 10, completion: 5 },
            }),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        room.hireAgent = jest.fn();
        const emit = jest.fn();

        await room.streamCeoMessage('build a page', undefined, undefined, emit);

        expect(room.hireAgent).not.toHaveBeenCalled();
        expect(room.delegate).toHaveBeenCalledWith('build a page', ['dev'], undefined, undefined);
    });

    it('never mentions cost for free local runs ($0 estimate skipped)', async () => {
        const room = makeRoom();
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '{"reply":"On it.","delegates":["dev"]}',
                usage: { prompt: 10, completion: 5 },
            }),
        });
        room.delegate = jest.fn().mockResolvedValue(undefined);
        const emit = jest.fn();

        await room.streamCeoMessage('build a page', undefined, undefined, emit);

        const tokenCall = emit.mock.calls.find((c: any[]) => c[0].type === 'token');
        expect(tokenCall[0].token).toBe('On it.');
    });
});

describe('buildTeamContext — cross-agent context passing', () => {
    it('returns empty string when no prior outputs', () => {
        expect(buildTeamContext([])).toBe('');
    });

    it('includes each teammate name and output excerpt', () => {
        const ctx = buildTeamContext([
            { agentName: 'Ray', excerpt: 'Market research: 3 competitors found.' },
            { agentName: 'Cleo', excerpt: 'Headline: Waste less, earn more.' },
        ]);
        expect(ctx).toContain('Output from Ray');
        expect(ctx).toContain('3 competitors found');
        expect(ctx).toContain('Output from Cleo');
        expect(ctx).toContain('Waste less, earn more');
        expect(ctx).toContain('build directly on it');
    });
});

describe('normalizeDeliverable', () => {
    // Regression: live run 2026-07-31 11:09:22 produced a complete HTML document behind a
    // one-line title, and it was saved as .md — a landing page no browser would render.
    it('saves HTML as .html even when the model prefixes a stray title line', () => {
        const raw = 'Manage Food Waste with RecipeKeeper\n\n<!DOCTYPE html>\n<html lang="en">\n<head></head>\n</html>';
        const { content, extension } = normalizeDeliverable(raw, 'dev');
        expect(extension).toBe('html');
        expect(content.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(content).not.toContain('Manage Food Waste with RecipeKeeper');
    });

    it('unwraps a ```html fence', () => {
        const raw = '```html\n<!DOCTYPE html>\n<html><body>hi</body></html>\n```';
        const { content, extension } = normalizeDeliverable(raw, 'dev');
        expect(extension).toBe('html');
        expect(content.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(content.endsWith('</html>')).toBe(true);
    });

    it('still detects a document that starts with <html> directly', () => {
        const { extension } = normalizeDeliverable('<html><body>x</body></html>', 'dev');
        expect(extension).toBe('html');
    });

    it('leaves genuine markdown as .md and does not slice it', () => {
        const raw = '# FoodWise\n\n## Tagline\nReduce food waste.';
        const { content, extension } = normalizeDeliverable(raw, 'copywriter');
        expect(extension).toBe('md');
        expect(content).toBe(raw);
    });

    // The 500-char window: prose that merely mentions HTML far down is not a document.
    it('does not treat a late <html> mention in prose as a document', () => {
        const raw = `${'Some notes about the page. '.repeat(40)}\nUse <html> tags here.`;
        expect(normalizeDeliverable(raw, 'copywriter').extension).toBe('md');
    });

    it('classifies non-HTML dev output containing code as .js', () => {
        expect(normalizeDeliverable('function build() { return 1; }', 'dev').extension).toBe('js');
        // same text from a writer is prose, not a program
        expect(normalizeDeliverable('function build() { return 1; }', 'copywriter').extension).toBe('md');
    });
});

describe('hireAgent — office capacity', () => {
    // The 6-hire cap is a documented limit ("max 11 agents" in docs/api.md) that had
    // no test, and its refusal was being reported to the dashboard as ok:true.
    it('refuses past 6 hires with an error instead of throwing', () => {
        const room = makeRoom();
        room.hireCount = 6;
        const result = room.hireAgent('Fiona', 'Financial Analyst');
        expect(result.error).toMatch(/full/i);
    });

    it('does not consume a slot when it refuses', () => {
        const room = makeRoom();
        room.hireCount = 6;
        room.hireAgent('Fiona', 'Financial Analyst');
        room.hireAgent('Sam', 'Designer');
        expect(room.hireCount).toBe(6);
    });
});

describe('runSpecialistTask — a deliverable that never lands is a failed task', () => {
    // Regression: a failed write_file fell through to completeTask() with an undefined
    // path and broadcast task:completed + "Task complete." The product's entire promise
    // is real output files, so a silent write failure is the worst possible lie.
    function makeSpecialistRoom(writeSucceeds: boolean) {
        const room = makeRoom();
        room.sessionProvider = undefined;
        room.sessionApiKey = undefined;
        room.getAdapter = () => ({
            complete: jest.fn().mockResolvedValue({
                content: '# Landing page copy',
                usage: { prompt: 10, completion: 20 },
            }),
        });
        room.toolExecutor = {
            execute: jest.fn().mockResolvedValue(
                writeSucceeds
                    ? { success: true, output: 'File written: output/copywriter/page.md' }
                    : { success: false, output: '', error: 'EACCES: permission denied' },
            ),
        };
        room.taskManager.completeTask = jest.fn().mockResolvedValue(undefined);
        room.taskManager.markTaskFailed = jest.fn().mockResolvedValue(undefined);
        return room;
    }

    const broadcastTypes = (room: any) => room.broadcast.mock.calls.map(([t]: any[]) => t);

    it('marks the task failed when the file cannot be written', async () => {
        const room = makeSpecialistRoom(false);
        await room.runSpecialistTask('copywriter', 1, 'Write the copy', undefined, undefined, undefined, []);

        expect(room.taskManager.markTaskFailed).toHaveBeenCalledWith(1);
        expect(room.taskManager.completeTask).not.toHaveBeenCalled();
        expect(broadcastTypes(room)).toContain('task:failed');
        expect(broadcastTypes(room)).not.toContain('task:completed');
    });

    it('completes normally when the file is written', async () => {
        const room = makeSpecialistRoom(true);
        await room.runSpecialistTask('copywriter', 1, 'Write the copy', undefined, undefined, undefined, []);

        expect(room.taskManager.completeTask).toHaveBeenCalledWith(1, 'output/copywriter/page.md');
        expect(room.taskManager.markTaskFailed).not.toHaveBeenCalled();
        expect(broadcastTypes(room)).toContain('task:completed');
    });
});
