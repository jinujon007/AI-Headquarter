import { MemoryStore } from './MemoryStore';

// Ollama /api/embeddings is a real network call — mock fetch so tests are fast and offline.
const okJson = (data: unknown) =>
    new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

const _origFetch = globalThis.fetch;
beforeAll(() => { jest.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ embedding: new Array(768).fill(0.01) }) as any); });
afterAll(() => { (globalThis.fetch as any) = _origFetch; });

async function createStore(): Promise<MemoryStore> {
    const store = new MemoryStore('http://localhost:11434');
    await store.initialize(':memory:');
    return store;
}

describe('MemoryStore — task lifecycle', () => {
    it('createTask returns a positive integer ID', async () => {
        const store = await createStore();
        const id = await store.createTask('Build landing page', 'dev');
        expect(id).toBeGreaterThan(0);
        await store.close();
    });

    it('completeTask sets status=completed and output_path', async () => {
        const store = await createStore();
        const id = await store.createTask('Research competitors', 'researcher');
        await store.completeTask(id, 'output/researcher/report.md');

        const tasks = await store.getTasks();
        const task = tasks.find((t: any) => t.id === id);
        expect(task.status).toBe('completed');
        expect(task.output_path).toBe('output/researcher/report.md');
        await store.close();
    });

    it('markTaskFailed sets status=failed', async () => {
        const store = await createStore();
        const id = await store.createTask('Write copy', 'copywriter');
        await store.markTaskFailed(id);

        const tasks = await store.getTasks();
        const task = tasks.find((t: any) => t.id === id);
        expect(task.status).toBe('failed');
        await store.close();
    });

    it('getRecentTasks returns tasks ordered newest first', async () => {
        const store = await createStore();
        await store.createTask('Task A', 'dev');
        await store.createTask('Task B', 'dev');
        await store.createTask('Task C', 'dev');

        const tasks = await store.getRecentTasks(10);
        expect(tasks[0].title).toBe('Task C');
        await store.close();
    });

    it('markTaskFailed on non-existent ID is a no-op (does not throw)', async () => {
        const store = await createStore();
        await expect(store.markTaskFailed(99999)).resolves.not.toThrow();
        await store.close();
    });
});

describe('MemoryStore — usage tracking and cost calculation', () => {
    it('getCostsData returns empty cost shape when no usage logged', async () => {
        const store = await createStore();
        const costs = await store.getCostsData();

        expect(costs).toHaveProperty('today');
        expect(costs).toHaveProperty('yesterday');
        expect(costs).toHaveProperty('thisMonth');
        expect(costs).toHaveProperty('lastMonth');
        expect(costs).toHaveProperty('projected');
        expect(costs).toHaveProperty('budget');
        expect(Array.isArray(costs.byAgent)).toBe(true);
        expect(Array.isArray(costs.byModel)).toBe(true);
        expect(Array.isArray(costs.daily)).toBe(true);
        await store.close();
    });

    it('claude models are priced at $3/1M input and $15/1M output', async () => {
        const store = await createStore();
        const taskId = await store.createTask('test', 'dev');

        // 1000 input @ $3/1M = $0.003, 500 output @ $15/1M = $0.0075 → $0.0105 total
        await store.logUsage('session1', 'dev', taskId, 'claude-sonnet-4-5', 1000, 500);

        const costs = await store.getCostsData();
        expect(costs.today).toBeCloseTo(0.0105, 6);
        expect(costs.byAgent).toHaveLength(1);
        expect(costs.byAgent[0].agent).toBe('dev');
        expect(costs.byModel).toHaveLength(1);
        expect(costs.byModel[0].model).toBe('claude-sonnet-4-5');
        expect(costs.byModel[0].cost).toBeCloseTo(0.0105, 6);
        await store.close();
    });

    it('ollama/local models cost $0 regardless of token volume', async () => {
        const store = await createStore();
        const taskId = await store.createTask('test', 'dev');

        await store.logUsage('session1', 'dev', taskId, 'llama3.1:8b', 1_000_000, 500_000);
        await store.logUsage('session1', 'dev', taskId, 'ollama/mistral', 1_000_000, 500_000);

        const costs = await store.getCostsData();
        expect(costs.today).toBe(0);
        expect(costs.thisMonth).toBe(0);
        expect(costs.projected).toBe(0);
        expect(costs.byAgent[0].cost).toBe(0);
        expect(costs.byAgent[0].tokens).toBe(3_000_000);
        await store.close();
    });

    it('gpt-4o-mini prefix matches before gpt-4o (0.15/0.6, not 2.5/10)', async () => {
        const store = await createStore();
        const taskId = await store.createTask('test', 'dev');

        // 1M input @ $0.15/1M + 1M output @ $0.6/1M = $0.75
        await store.logUsage('session1', 'dev', taskId, 'gpt-4o-mini', 1_000_000, 1_000_000);

        const costs = await store.getCostsData();
        expect(costs.today).toBeCloseTo(0.75, 6);
        await store.close();
    });

    it('byAgent sums across multiple usage entries for the same agent', async () => {
        const store = await createStore();
        const t1 = await store.createTask('task1', 'researcher');
        const t2 = await store.createTask('task2', 'researcher');

        await store.logUsage('s1', 'researcher', t1, 'llama3.1:8b', 200, 100);
        await store.logUsage('s1', 'researcher', t2, 'llama3.1:8b', 300, 150);

        const costs = await store.getCostsData();
        const agentEntry = costs.byAgent.find((a: any) => a.agent === 'researcher');
        expect(agentEntry).toBeDefined();
        expect(agentEntry.tokens).toBe(750); // 200+100+300+150
        await store.close();
    });
});

describe('MemoryStore — memory operations', () => {
    it('saveMemory and loadMemories round-trip', async () => {
        const store = await createStore();

        await store.saveMemory('pa', {
            content: 'CEO asked for a landing page',
            type: 'conversation',
            timestamp: new Date().toISOString(),
            importance: 1.0,
        }, 'session1');

        const memories = await store.loadMemories('pa', 10);
        expect(memories).toHaveLength(1);
        expect(memories[0].content).toBe('CEO asked for a landing page');
        expect(memories[0].importance).toBe(1.0);
        await store.close();
    });

    it('loadMemories returns empty array for unknown agent', async () => {
        const store = await createStore();
        const memories = await store.loadMemories('nonexistent', 10);
        expect(memories).toEqual([]);
        await store.close();
    });

    it('loadMemories orders by importance desc', async () => {
        const store = await createStore();
        const ts = new Date().toISOString();

        await store.saveMemory('dev', { content: 'low', type: 'task_result', timestamp: ts, importance: 0.3 });
        await store.saveMemory('dev', { content: 'high', type: 'task_result', timestamp: ts, importance: 0.9 });
        await store.saveMemory('dev', { content: 'mid', type: 'task_result', timestamp: ts, importance: 0.6 });

        const memories = await store.loadMemories('dev', 10);
        expect(memories[0].content).toBe('high');
        expect(memories[1].content).toBe('mid');
        expect(memories[2].content).toBe('low');
        await store.close();
    });
});
