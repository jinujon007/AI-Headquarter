import { InferenceAdapter, CompletionRequest, CompletionResponse } from '@aihq/core';

export class OpenAICompatibleAdapter implements InferenceAdapter {
    public readonly isLocal = false;

    constructor(
        private baseUrl: string,
        private apiKey: string,
        public readonly provider: string = 'openai'
    ) { }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const start = Date.now();

        // Map tools if required
        const tools = request.tools ? request.tools.map(t => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        })) : undefined;

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                tools,
                temperature: request.temperature,
                ...(request.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
            })
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => response.statusText);
            throw new Error(`${this.provider} Error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const latency = Date.now() - start;
        const message = data.choices[0].message;

        let toolCalls;
        if (message.tool_calls) {
            toolCalls = message.tool_calls.map((tc: any) => ({
                name: tc.function.name,
                params: JSON.parse(tc.function.arguments)
            }));
        }

        return {
            content: message.content || '',
            toolCalls,
            usage: {
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0
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
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                stream: true,
                temperature: options.temperature ?? 0.7,
            }),
        });

        if (!response.ok || !response.body) {
            const errBody = !response.ok ? await response.text().catch(() => '') : '';
            options.onDone();
            throw new Error(`${this.provider} stream ${response.status}${errBody ? ': ' + errBody : ''}`);
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

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') {
                        callDone();
                        return fullText;
                    }
                    try {
                        const data = JSON.parse(payload);
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            options.onToken(content);
                        }
                        if (data.choices?.[0]?.finish_reason === 'stop') {
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

