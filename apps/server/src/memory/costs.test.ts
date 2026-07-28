import { MemoryStore, costOf, estimateRunCost, budgetBlocks } from './MemoryStore';

// Ollama /api/embeddings is a real network call — mock fetch so tests are fast and offline.
const okJson = (data: unknown) =>
    new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

const _origFetch = globalThis.fetch;
beforeAll(() => { jest.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ embedding: [0.01] }) as any); });
afterAll(() => { (globalThis.fetch as any) = _origFetch; });

async function createStore(): Promise<MemoryStore> {
    const store = new MemoryStore('http://localhost:11434');
    await store.initialize(':memory:');
    return store;
}

describe('estimateRunCost — pre-run estimator math', () => {
    it('prices delegate count × avg tokens via the pricing table', () => {
        // claude: $3/1M in, $15/1M out → 2000 in + 1000 out = $0.021 per call
        const est = estimateRunCost(3, 'claude-sonnet-4', { prompt: 2000, completion: 1000 });
        expect(est).toBeCloseTo(3 * (2000 * 3 + 1000 * 15) / 1_000_000, 10);
    });

    it('falls back to 2k-in/1k-out per call with no usage history', () => {
        const est = estimateRunCost(2, 'gpt-4o', null);
        expect(est).toBeCloseTo(2 * (2000 * 2.5 + 1000 * 10) / 1_000_000, 10);
    });

    it('is $0 for local Ollama models', () => {
        expect(estimateRunCost(5, 'llama3.2:3b', { prompt: 9999, completion: 9999 })).toBe(0);
    });
});

describe('budgetBlocks — cap refusal logic', () => {
    it('no cap set → never blocks (current behavior preserved)', () => {
        expect(budgetBlocks('claude-sonnet-4', null, 999)).toBe(false);
    });

    it('free local models are never blocked even over cap', () => {
        expect(budgetBlocks('llama3.2:3b', 0.01, 5)).toBe(false);
    });

    it('blocks paid model once spend reaches the cap', () => {
        expect(budgetBlocks('claude-sonnet-4', 0.01, 0.01)).toBe(true);
        expect(budgetBlocks('gpt-4o', 10, 12)).toBe(true);
    });

    it('does not block below the cap', () => {
        expect(budgetBlocks('claude-sonnet-4', 10, 9.99)).toBe(false);
    });
});

describe('MemoryStore — settings + spend tracking', () => {
    it('setSetting/getSetting round-trips and deletes on null', async () => {
        const store = await createStore();
        await store.setSetting('budget_usd', '5');
        expect(await store.getSetting('budget_usd')).toBe('5');
        await store.setSetting('budget_usd', null);
        expect(await store.getSetting('budget_usd')).toBeNull();
        await store.close();
    });

    it('getBudgetUsd: settings value wins over env; empty means no cap', async () => {
        const store = await createStore();
        process.env.AIHQ_BUDGET_USD = '50';
        expect(await store.getBudgetUsd()).toBe(50);
        await store.setSetting('budget_usd', '2.5');
        expect(await store.getBudgetUsd()).toBe(2.5);
        delete process.env.AIHQ_BUDGET_USD;
        await store.setSetting('budget_usd', null);
        expect(await store.getBudgetUsd()).toBeNull();
        await store.close();
    });

    it('getMonthToDateSpend sums this month priced via the pricing table', async () => {
        const store = await createStore();
        // claude: 1M in + 1M out = $18
        await store.logUsage('s1', 'dev', 1, 'claude-sonnet-4', 1_000_000, 1_000_000);
        // ollama rows are free
        await store.logUsage('s1', 'pa', 0, 'llama3.2:3b', 500_000, 500_000);
        const spend = await store.getMonthToDateSpend();
        expect(spend).toBeCloseTo(18, 6);
        await store.close();
    });

    it('getAvgTokensPerCall averages logged usage; null with no history', async () => {
        const store = await createStore();
        expect(await store.getAvgTokensPerCall()).toBeNull();
        await store.logUsage('s1', 'dev', 1, 'claude-sonnet-4', 1000, 400);
        await store.logUsage('s1', 'researcher', 2, 'claude-sonnet-4', 3000, 600);
        const avg = await store.getAvgTokensPerCall();
        expect(avg).toEqual({ prompt: 2000, completion: 500 });
        await store.close();
    });

    it('costOf: unknown models default to free', () => {
        expect(costOf('totally-unknown-model', 1000, 1000)).toBe(0);
    });
});
