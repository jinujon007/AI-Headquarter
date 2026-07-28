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
            case 'write_file':
                return this.writeNote(params.content, {
                    agentId: params?.agentId,
                    filename: params?.filename,
                    extension: params?.extension,
                });
            case 'read_file':
                return this.readFile(params.path);
            default:
                return { success: false, output: '', error: `Unknown tool: ${toolName}` };
        }
    }

    private executeCode(code: string, language: string): ToolResult {
        if (language === 'python' || language === 'py') {
            return this.executePython(code);
        }
        if (language !== 'javascript' && language !== 'js') {
            return { success: false, output: '', error: 'Supported languages: javascript, python.' };
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

    private executePython(code: string): ToolResult {
        const { execFileSync } = require('child_process');
        try {
            const output = execFileSync('python3', ['-c', code], {
                timeout: 5000,
                maxBuffer: 100 * 1024,
                env: { PATH: process.env.PATH },
            });
            return { success: true, output: output.toString().trim() };
        } catch (e: any) {
            const stderr = e.stderr?.toString() || '';
            const stdout = e.stdout?.toString() || '';
            if (e.code === 'ETIMEDOUT') return { success: false, output: '', error: 'Python execution timed out (5s).' };
            if (e.code === 'ENOENT') return { success: false, output: '', error: 'python3 not found on this system.' };
            return { success: false, output: stdout, error: stderr || e.message };
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
             const allowedExtensions = ['md', 'txt', 'html', 'js', 'json', 'csv'];
             const requestedExt = (params?.extension || 'md').toLowerCase();
             const ext = allowedExtensions.includes(requestedExt) ? requestedExt : 'md';
             const outputRoot = path.resolve(process.cwd(), 'output');
             const filename = `${timestamp}-${slug || 'note'}.${ext}`;
             const filepath = path.resolve(outputRoot, agentId, filename);
             // Enforce that resolved path is strictly inside output/ (agentId is LLM-controlled)
             if (!filepath.startsWith(outputRoot + path.sep)) {
                 return { success: false, output: '', error: 'Access denied: path must be within output/' };
             }
             await mkdir(path.dirname(filepath), { recursive: true });
             await writeFile(filepath, content, 'utf-8');
             const relativePath = path.relative(process.cwd(), filepath);
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
