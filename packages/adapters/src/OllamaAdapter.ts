import { InferenceAdapter, CompletionRequest, CompletionResponse } from '@aihq/core';

export class OllamaAdapter implements InferenceAdapter {
    public readonly provider = 'ollama';
    public readonly isLocal = true;

    constructor(private baseUrl: string = 'http://localhost:11434') { }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const start = Date.now();
        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 60_000);
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                stream: false,
                tools: request.tools,
                options: { temperature: request.temperature }
            })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const data = await response.json();
        const latency = Date.now() - start;

        let toolCalls;
        if (data.message.tool_calls) {
            toolCalls = data.message.tool_calls.map((tc: any) => ({
                name: tc.function.name,
                params: tc.function.arguments
            }));
        }

        return {
            content: data.message.content || '',
            toolCalls,
            usage: {
                prompt: data.prompt_eval_count || 0,
                completion: data.eval_count || 0
            },
            latency
        };
    }

    async stream(options: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        onToken: (token: string) => void;
        onDone: () => void;
        temperature?: number;
    }): Promise<string> {
        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 60_000);
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                stream: true,
                options: { temperature: options.temperature ?? 0.7 },
            }),
        });
        clearTimeout(timeoutId);

        if (!response.ok || !response.body) {
            throw new Error(`Ollama stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);
                    if (data.message?.content) {
                        fullText += data.message.content;
                        options.onToken(data.message.content);
                    }
                    if (data.done === true) {
                        options.onDone();
                    }
                } catch {
                    // incomplete chunk — skip
                }
            }
        }

        return fullText;
    }
}

