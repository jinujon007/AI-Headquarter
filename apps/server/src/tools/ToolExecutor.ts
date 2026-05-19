import vm from 'vm';
import { tavily, type TavilyClient, type TavilySearchResponse } from '@tavily/core';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export class ToolExecutor {
    private tavilyClient: TavilyClient | null = null;

    private getTavilyClient(): TavilyClient | null {
        if (this.tavilyClient) return this.tavilyClient;
        const apiKey = process.env.TAVILY_API_KEY;
        if (apiKey) {
            this.tavilyClient = tavily({ apiKey });
            return this.tavilyClient;
        }
        return null;
    }

    async execute(toolName: string, params: any): Promise<ToolResult> {
        switch (toolName) {
            case 'code_execute':
                return Promise.resolve(this.executeCode(params.code, params.language || 'javascript'));
            case 'web_search':
                return this.webSearch(params.query);
        case 'write_note':
            return this.writeNote(params.content, { 
                agentId: params?.agentId, 
                filename: params?.filename, 
                extension: params?.extension 
            });
        case 'write_file':
            return this.writeNote(params.content, { 
                agentId: params?.agentId, 
                filename: params?.filename, 
                extension: params?.extension 
            });
            case 'read_file':
                return this.readFile(params.path);
            default:
                return { success: false, output: '', error: `Unknown tool: ${toolName}` };
        }
    }

    private executeCode(code: string, language: string): ToolResult {
        if (language !== 'javascript' && language !== 'js') {
            return { success: false, output: '', error: 'Only JavaScript is supported for sandboxed execution.' };
        }

        const output: string[] = [];
        const sandbox = vm.createContext({
            console: {
                log:   (...args: unknown[]) => output.push(args.map(String).join(' ')),
                error: (...args: unknown[]) => output.push('[err] ' + args.map(String).join(' ')),
                warn:  (...args: unknown[]) => output.push('[warn] ' + args.map(String).join(' ')),
            },
            Math, JSON, Date, Array, Object, String, Number, Boolean, RegExp,
            parseInt, parseFloat, isNaN, isFinite,
        });

        try {
            const result = vm.runInContext(code, sandbox, { timeout: 5000, filename: 'sandbox.js' });
            if (result !== undefined) output.push(JSON.stringify(result));
            return { success: true, output: output.join('\n') || 'Executed (no output).' };
        } catch (e: unknown) {
            const err = e as NodeJS.ErrnoException;
            if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
                return { success: false, output: output.join('\n'), error: 'Execution timed out (5s limit).' };
            }
            return { success: false, output: output.join('\n'), error: (e as Error).message };
        }
    }

    private async webSearch(query: string): Promise<ToolResult> {
        const client = this.getTavilyClient();
        if (client) {
            return this.webSearchTavily(query, client);
        }
        return this.webSearchDuckDuckGo(query);
    }

    private async webSearchTavily(query: string, client: TavilyClient): Promise<ToolResult> {
        try {
            const response = await client.search(query, { maxResults: 5 });

            const results = (response.results || [])
                .map((r: TavilySearchResponse['results'][number]) => `${r.title}: ${r.content}`)
                .join('\n\n');

            const output = results
                ? `Results:\n${results}`
                : `No results for "${query}".`;

            return { success: true, output };
        } catch (e: any) {
            return { success: false, output: '', error: `Tavily search failed: ${e.message}` };
        }
    }

    private async webSearchDuckDuckGo(query: string): Promise<ToolResult> {
        try {
            // Use a simple fetch to DuckDuckGo Instant Answer API (no API key needed)
            const encoded = encodeURIComponent(query);
            const res = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`);
            const data = await res.json();

            const abstract = data.Abstract || data.AbstractText || '';
            const relatedTopics = (data.RelatedTopics || []).slice(0, 3).map((t: any) => t.Text || '').join('; ');

            const output = abstract
                ? `Result: ${abstract}`
                : relatedTopics
                    ? `Related: ${relatedTopics}`
                    : `No direct results for "${query}".`;

            return { success: true, output };
        } catch (e: any) {
            return { success: false, output: '', error: `Search failed: ${e.message}` };
        }
    }

    private async writeNote(content: string, params?: { agentId?: string; filename?: string; extension?: string }): Promise<ToolResult> {
        try {
            const { writeFile, mkdir } = await import('fs/promises');
            const path = await import('path');
            const agentId = params?.agentId || 'agent';
            const slug = (params?.filename || content.slice(0, 30))
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dir = path.join(process.cwd(), 'output', agentId);
            await mkdir(dir, { recursive: true });
            const ext = params.extension || 'md';
            const filename = `${timestamp}-${slug || 'note'}.${ext}`;
            const filepath = path.join(dir, filename);
            await writeFile(filepath, content, 'utf-8');
            const relativePath = path.join('output', agentId, filename);
            return { success: true, output: `File written: ${relativePath}` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }

    private async readFile(filePath: string): Promise<ToolResult> {
        const pathModule = await import('path');
        const { readFile } = await import('fs/promises');
        try {
            const allowedRoot = pathModule.resolve(process.cwd(), 'output');
            const resolved = pathModule.resolve(process.cwd(), filePath);
            // Enforce that resolved path is strictly inside output/
            if (!resolved.startsWith(allowedRoot + pathModule.sep) && resolved !== allowedRoot) {
                return { success: false, output: '', error: 'Access denied: path must be within output/' };
            }
            const content = await readFile(resolved, 'utf-8');
            return { success: true, output: content.slice(0, 2000) };
        } catch (e: unknown) {
            return { success: false, output: '', error: (e as Error).message };
        }
    }
}
