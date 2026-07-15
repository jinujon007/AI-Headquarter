import { OpenAICompatibleAdapter } from '../OpenAICompatibleAdapter';

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
    const text = lines.join('\n') + '\n';
    return new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            controller.close();
        },
    });
}

describe('OpenAICompatibleAdapter.complete()', () => {
    let adapter: OpenAICompatibleAdapter;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        adapter = new OpenAICompatibleAdapter('https://api.openai.com/v1', 'test-key', 'openai');
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    it('returns content and usage from a successful response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Hello' } }],
                usage: { prompt_tokens: 8, completion_tokens: 3 },
            }),
        });

        const result = await adapter.complete({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hi' }],
        });

        expect(result.content).toBe('Hello');
        expect(result.usage?.prompt).toBe(8);
        expect(result.usage?.completion).toBe(3);
    });

    it('sends Bearer auth header', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '' } }], usage: {} }),
        });

        await adapter.complete({ model: 'gpt-4o-mini', messages: [] });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['Authorization']).toBe('Bearer test-key');
    });

    it('throws error that includes status code and response body (not empty statusText)', async () => {
        // Two complete() calls below — mock must answer both, not just the first.
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            statusText: '',
            text: async () => '{"error":{"message":"Incorrect API key"}}',
        });

        await expect(adapter.complete({ model: 'gpt-4o-mini', messages: [] }))
            .rejects.toThrow('401');

        let caughtMessage = '';
        try {
            await adapter.complete({ model: 'gpt-4o-mini', messages: [] });
        } catch (e: any) {
            caughtMessage = e.message;
        }
        // statusText is '' — error must come from body read, not statusText
        expect(caughtMessage).toContain('401');
    });

    it('parses tool_calls from response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: null,
                        tool_calls: [{
                            function: { name: 'web_search', arguments: '{"query":"test"}' }
                        }]
                    }
                }],
                usage: { prompt_tokens: 5, completion_tokens: 10 },
            }),
        });

        const result = await adapter.complete({ model: 'gpt-4o-mini', messages: [] });
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls![0].name).toBe('web_search');
        expect(result.toolCalls![0].params).toEqual({ query: 'test' });
    });
});

describe('OpenAICompatibleAdapter.stream()', () => {
    let adapter: OpenAICompatibleAdapter;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        adapter = new OpenAICompatibleAdapter('https://api.openai.com/v1', 'test-key', 'openai');
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    it('calls onToken for each delta and returns full text', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: sseStream([
                'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}',
                'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}',
                'data: [DONE]',
            ]),
        });

        const tokens: string[] = [];
        const result = await adapter.stream({
            model: 'gpt-4o-mini',
            messages: [],
            onToken: (t) => tokens.push(t),
            onDone: jest.fn(),
        });

        expect(tokens).toEqual(['Hello', ' world']);
        expect(result).toBe('Hello world');
    });

    it('calls onDone exactly once via [DONE] sentinel', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: sseStream([
                'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":null}]}',
                'data: [DONE]',
            ]),
        });

        const onDone = jest.fn();
        await adapter.stream({ model: 'gpt-4o-mini', messages: [], onToken: jest.fn(), onDone });
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('calls onDone exactly once via finish_reason stop', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: sseStream([
                'data: {"choices":[{"delta":{"content":"bye"},"finish_reason":"stop"}]}',
            ]),
        });

        const onDone = jest.fn();
        await adapter.stream({ model: 'gpt-4o-mini', messages: [], onToken: jest.fn(), onDone });
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('calls onDone exactly once when stream ends without explicit signal', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: sseStream([
                'data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}',
                // no [DONE] — stream just ends
            ]),
        });

        const onDone = jest.fn();
        await adapter.stream({ model: 'gpt-4o-mini', messages: [], onToken: jest.fn(), onDone });
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('calls onDone exactly once on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
            body: null,
            text: async () => 'rate_limit_exceeded',
        });

        const onDone = jest.fn();
        await expect(
            adapter.stream({ model: 'gpt-4o-mini', messages: [], onToken: jest.fn(), onDone })
        ).rejects.toThrow();

        expect(onDone).toHaveBeenCalledTimes(1);
    });
});
