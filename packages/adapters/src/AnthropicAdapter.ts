import { InferenceAdapter, CompletionRequest, CompletionResponse } from '@aihq/core';

const ANTHROPIC_API = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;

// Anthropic rejects role:'system' inside messages — system prompts go in the top-level `system` param.
function splitSystem(messages: Array<{ role: string; content: string }>): {
    system: string | undefined;
    messages: Array<{ role: string; content: string }>;
} {
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    return {
        system: systemParts.length ? systemParts.join('\n\n') : undefined,
        messages: messages.filter(m => m.role !== 'system'),
    };
}

export class AnthropicAdapter implements InferenceAdapter {
    public readonly provider = 'anthropic';
    public readonly isLocal = false;

    constructor(private apiKey: string) {}

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const start = Date.now();

        const tools = request.tools ? request.tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters ?? { type: 'object', properties: {} }
        })) : undefined;

        const { system, messages } = splitSystem(request.messages);
        const body: Record<string, unknown> = {
            model: request.model,
            messages,
            max_tokens: DEFAULT_MAX_TOKENS,
            temperature: request.temperature ?? 0.7,
        };
        if (system) body.system = system;
        if (tools?.length) body.tools = tools;

        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 60_000);
        const response = await fetch(`${ANTHROPIC_API}/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: ac.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.text().catch(() => response.statusText);
            throw new Error(`Anthropic Error ${response.status}: ${err}`);
        }

        const data = await response.json();
        const latency = Date.now() - start;

        let content = '';
        let toolCalls: Array<{ name: string; params: Record<string, unknown> }> | undefined;

        for (const block of data.content ?? []) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                toolCalls = toolCalls ?? [];
                toolCalls.push({ name: block.name, params: block.input ?? {} });
            }
        }

        return {
            content,
            toolCalls,
            usage: {
                prompt: data.usage?.input_tokens ?? 0,
                completion: data.usage?.output_tokens ?? 0,
            },
            latency,
        };
    }

    async stream(options: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        onToken: (token: string) => void;
        onDone: () => void;
        temperature?: number;
    }): Promise<string> {
        const { system, messages } = splitSystem(options.messages);
        const streamBody: Record<string, unknown> = {
            model: options.model,
            messages,
            max_tokens: DEFAULT_MAX_TOKENS,
            temperature: options.temperature ?? 0.7,
            stream: true,
        };
        if (system) streamBody.system = system;

        const streamAc = new AbortController();
        const streamTimeoutId = setTimeout(() => streamAc.abort(), 60_000);
        const response = await fetch(`${ANTHROPIC_API}/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(streamBody),
            signal: streamAc.signal,
        });
        clearTimeout(streamTimeoutId);

        if (!response.ok || !response.body) {
            options.onDone();
            throw new Error(`Anthropic stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        let doneCalled = false;
        const callDone = () => { if (!doneCalled) { doneCalled = true; options.onDone(); } };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                let eventType = '';
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim();
                        continue;
                    }
                    if (!line.startsWith('data: ')) continue;

                    const payload = line.slice(6).trim();
                    if (!payload) continue;

                    try {
                        const data = JSON.parse(payload);

                        if (eventType === 'content_block_delta' && data.delta?.type === 'text_delta') {
                            const text = data.delta.text ?? '';
                            if (text) {
                                fullText += text;
                                options.onToken(text);
                            }
                        }

                        if (eventType === 'message_stop') {
                            callDone();
                            return fullText;
                        }
                    } catch {
                        // incomplete chunk — skip
                    }
                }
            }
        } finally {
            callDone();
        }

        return fullText;
    }
}
