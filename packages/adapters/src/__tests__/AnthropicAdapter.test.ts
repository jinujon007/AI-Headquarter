import { AnthropicAdapter } from '../AnthropicAdapter';

// Helper: build a minimal SSE stream from an array of raw lines
function sseStream(lines: string[]): ReadableStream<Uint8Array> {
    const text = lines.join('\n') + '\n';
    return new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            controller.close();
        },
    });
}

function mockResponse(body: object): Response {
    return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

function mockErrorResponse(status: number, body: string): Response {
    return {
        ok: false,
        status,
        text: async () => body,
        statusText: '',
    } as unknown as Response;
}

describe('AnthropicAdapter.complete()', () => {
    let adapter: AnthropicAdapter;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        adapter = new AnthropicAdapter('test-api-key');
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    it('returns content and usage from a successful response', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [{ type: 'text', text: 'Hello from Claude' }],
            usage: { input_tokens: 10, output_tokens: 5 },
        }));

        const result = await adapter.complete({
            model: 'claude-sonnet-4-6',
            messages: [{ role: 'user', content: 'Hi' }],
        });

        expect(result.content).toBe('Hello from Claude');
        expect(result.usage?.prompt).toBe(10);
        expect(result.usage?.completion).toBe(5);
    });

    it('sends correct auth headers', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 1, output_tokens: 1 },
        }));

        await adapter.complete({ model: 'claude-sonnet-4-6', messages: [] });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers['x-api-key']).toBe('test-api-key');
        expect(init.headers['anthropic-version']).toBeDefined();
    });

    it('throws with status code and body on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce(mockErrorResponse(401, '{"error":"invalid_api_key"}'));

        await expect(adapter.complete({ model: 'claude-sonnet-4-6', messages: [] }))
            .rejects.toThrow('401');
    });

    it('extracts system messages into the top-level system param', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 1, output_tokens: 1 },
        }));

        await adapter.complete({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: 'system', content: 'You are Alex, the PA.' },
                { role: 'user', content: 'Hi' },
            ],
        });

        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(body.system).toBe('You are Alex, the PA.');
        expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    });

    it('joins multiple system messages into one system param', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 1, output_tokens: 1 },
        }));

        await adapter.complete({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: 'system', content: 'First instruction.' },
                { role: 'system', content: 'Second instruction.' },
                { role: 'user', content: 'Hi' },
            ],
        });

        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(body.system).toBe('First instruction.\n\nSecond instruction.');
        expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
    });

    it('omits the system param when there are no system messages', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 1, output_tokens: 1 },
        }));

        await adapter.complete({
            model: 'claude-sonnet-4-6',
            messages: [{ role: 'user', content: 'Hi' }],
        });

        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(body.system).toBeUndefined();
    });

    it('accumulates multiple text blocks', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse({
            content: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', text: 'world' },
            ],
            usage: { input_tokens: 5, output_tokens: 3 },
        }));

        const result = await adapter.complete({ model: 'claude-sonnet-4-6', messages: [] });
        expect(result.content).toBe('Hello world');
    });
});

describe('AnthropicAdapter.stream()', () => {
    let adapter: AnthropicAdapter;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        adapter = new AnthropicAdapter('test-api-key');
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    function makeStreamResponse(sseLines: string[]): Response {
        return {
            ok: true,
            status: 200,
            body: sseStream(sseLines),
        } as unknown as Response;
    }

    it('calls onToken for each text_delta and returns full text', async () => {
        mockFetch.mockResolvedValueOnce(makeStreamResponse([
            'event: content_block_delta',
            'data: {"delta":{"type":"text_delta","text":"Hello"}}',
            '',
            'event: content_block_delta',
            'data: {"delta":{"type":"text_delta","text":" world"}}',
            '',
            'event: message_stop',
            'data: {}',
        ]));

        const tokens: string[] = [];
        const result = await adapter.stream({
            model: 'claude-sonnet-4-6',
            messages: [],
            onToken: (t) => tokens.push(t),
            onDone: jest.fn(),
        });

        expect(tokens).toEqual(['Hello', ' world']);
        expect(result).toBe('Hello world');
    });

    it('extracts system messages into the top-level system param', async () => {
        mockFetch.mockResolvedValueOnce(makeStreamResponse([
            'event: message_stop',
            'data: {}',
        ]));

        await adapter.stream({
            model: 'claude-sonnet-4-6',
            messages: [
                { role: 'system', content: 'Be terse.' },
                { role: 'user', content: 'Hi' },
            ],
            onToken: jest.fn(),
            onDone: jest.fn(),
        });

        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(body.system).toBe('Be terse.');
        expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    });

    it('calls onDone exactly once on a successful stream', async () => {
        mockFetch.mockResolvedValueOnce(makeStreamResponse([
            'event: content_block_delta',
            'data: {"delta":{"type":"text_delta","text":"hi"}}',
            '',
            'event: message_stop',
            'data: {}',
        ]));

        const onDone = jest.fn();
        await adapter.stream({ model: 'claude-sonnet-4-6', messages: [], onToken: jest.fn(), onDone });

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('calls onDone exactly once when stream ends without message_stop', async () => {
        mockFetch.mockResolvedValueOnce(makeStreamResponse([
            'event: content_block_delta',
            'data: {"delta":{"type":"text_delta","text":"partial"}}',
            // no message_stop — stream just ends
        ]));

        const onDone = jest.fn();
        await adapter.stream({ model: 'claude-sonnet-4-6', messages: [], onToken: jest.fn(), onDone });

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('calls onDone exactly once on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            body: null,
        } as unknown as Response);

        const onDone = jest.fn();
        await expect(
            adapter.stream({ model: 'claude-sonnet-4-6', messages: [], onToken: jest.fn(), onDone })
        ).rejects.toThrow();

        expect(onDone).toHaveBeenCalledTimes(1);
    });
});
