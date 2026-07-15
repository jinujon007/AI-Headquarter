import { OfficeRoom, buildTeamContext } from './OfficeRoom';

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

    it('falls back when JSON lacks a reply string', () => {
        const room = makeRoom();
        const out = room.parseStructuredResponse('{"delegates":["dev"]}');
        // no reply field → substring fallback still finds "dev" in the raw text
        expect(out.delegates).toEqual(['dev']);
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
