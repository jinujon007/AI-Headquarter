import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { MemoryEntry } from '@aihq/core';

// Per-million-token pricing: [prefix, input $/1M, output $/1M]. First matching prefix wins,
// so more specific prefixes (gpt-4o-mini) must come before general ones (gpt-4o).
const MODEL_PRICING: [string, number, number][] = [
    ['ollama', 0, 0],
    ['llama', 0, 0],
    ['mistral', 0, 0],
    ['qwen', 0, 0],
    ['gemma', 0, 0],
    ['phi', 0, 0],
    ['claude', 3, 15],
    ['gpt-4o-mini', 0.15, 0.6],
    ['gpt-4o', 2.5, 10],
    ['gpt-4.1', 2, 8],
    ['gemini', 0.10, 0.40],
];

function costOf(model: string | null, promptTokens: number, completionTokens: number): number {
    const name = (model || '').toLowerCase();
    const entry = MODEL_PRICING.find(([prefix]) => name.startsWith(prefix));
    if (!entry) return 0; // Unknown models default to free — assumed local/self-hosted.
    return (promptTokens * entry[1] + completionTokens * entry[2]) / 1_000_000;
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export class MemoryStore {
    private db?: Database;
    private ollamaUrl: string;

    constructor(ollamaUrl: string = 'http://localhost:11434') {
        this.ollamaUrl = ollamaUrl;
    }

    async initialize(dbPath: string = './data/office-memory.db') {
        // Ensure data directory exists
        const { mkdir } = await import('fs/promises');
        const path = await import('path');
        await mkdir(path.dirname(dbPath), { recursive: true });

        this.db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                importance REAL NOT NULL DEFAULT 0.5,
                embedding TEXT,
                session_id TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
            CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                assigned_to TEXT,
                status TEXT DEFAULT 'pending',
                output_path TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS office_layout (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                layout_json TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT 'default',
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                agent_id TEXT,
                task_id INTEGER,
                model TEXT,
                prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
        `);

        // Migrations for existing databases
        try { await this.db.exec('ALTER TABLE memories ADD COLUMN embedding TEXT'); } catch { /* already exists */ }
        try { await this.db.exec('ALTER TABLE tasks ADD COLUMN output_path TEXT'); } catch { /* already exists */ }

        console.log('[MemoryStore] SQLite initialized at', dbPath);
    }

    // --- Embedding Generation ---

    private async generateEmbedding(text: string): Promise<number[] | null> {
        const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || process.env.OLLAMA_MODEL || 'llama3.1:8b';
        try {
            const ac = new AbortController();
            const timeoutId = setTimeout(() => ac.abort(), 10_000);
            const res = await fetch(`${this.ollamaUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: embeddingModel, prompt: text }),
                signal: ac.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) return null;
            const data = await res.json();
            return data.embedding || null;
        } catch {
            return null;
        }
    }

    // --- Memory Operations ---

    async saveMemory(agentId: string, entry: MemoryEntry, sessionId?: string): Promise<void> {
        if (!this.db) return;
        // Insert immediately without embedding so task completion is never delayed by Ollama.
        // Embedding is generated in the background and patched in after insert.
        const result = await this.db.run(
            'INSERT INTO memories (agent_id, content, type, timestamp, importance, embedding, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [agentId, entry.content, entry.type, entry.timestamp, entry.importance, null, sessionId || null]
        );
        if (entry.importance >= 0.5 && result.lastID && this.db) {
            const rowId = result.lastID;
            const db = this.db;
            this.generateEmbedding(entry.content).then(embedding => {
                if (embedding) {
                    db.run('UPDATE memories SET embedding = ? WHERE id = ?', [JSON.stringify(embedding), rowId]).catch(() => {});
                }
            }).catch(() => {});
        }
    }

    async saveMemories(agentId: string, entries: MemoryEntry[], sessionId?: string): Promise<void> {
        for (const entry of entries) {
            await this.saveMemory(agentId, entry, sessionId);
        }
    }

    async loadMemories(agentId: string, limit: number = 20): Promise<MemoryEntry[]> {
        if (!this.db) return [];
        const rows = await this.db.all(
            'SELECT content, type, timestamp, importance FROM memories WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?',
            [agentId, limit]
        );
        return rows.map((r: any) => ({
            content: r.content,
            type: r.type,
            timestamp: r.timestamp,
            importance: r.importance
        }));
    }

    async semanticSearch(agentId: string, query: string, topK: number = 5): Promise<MemoryEntry[]> {
        if (!this.db) return [];
        const queryEmbedding = await this.generateEmbedding(query);
        if (!queryEmbedding) return this.loadMemories(agentId, topK); // Fallback to recency

        const rows = await this.db.all(
            'SELECT content, type, timestamp, importance, embedding FROM memories WHERE agent_id = ? AND embedding IS NOT NULL',
            [agentId]
        );

        const scored = rows.map((r: any) => {
            const emb = JSON.parse(r.embedding);
            const score = cosineSimilarity(queryEmbedding, emb);
            return { content: r.content, type: r.type, timestamp: r.timestamp, importance: r.importance, score };
        }).sort((a, b) => b.score - a.score);

        return scored.slice(0, topK).map(s => ({
            content: s.content,
            type: s.type,
            timestamp: s.timestamp,
            importance: s.importance
        }));
    }

    // --- Task Operations ---

    async createTask(title: string, assignedTo?: string): Promise<number> {
        if (!this.db) return -1;
        const result = await this.db.run(
            'INSERT INTO tasks (title, assigned_to) VALUES (?, ?)',
            [title, assignedTo || null]
        );
        return result.lastID || -1;
    }

    async getTasks(): Promise<any[]> {
        if (!this.db) return [];
        return this.db.all('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50');
    }

    async getRecentTasks(limit: number = 50): Promise<any[]> {
        if (!this.db) return [];
        return this.db.all(`
            SELECT id, title, assigned_to as assignedTo, status, created_at as createdAt, completed_at as completedAt 
            FROM tasks 
            ORDER BY id DESC 
            LIMIT ?
        `, [limit]);
    }

    async assignTask(taskId: number, agentId: string): Promise<void> {
        if (!this.db) return;
        await this.db.run('UPDATE tasks SET assigned_to = ?, status = ? WHERE id = ?', [agentId, 'in_progress', taskId]);
    }

    async completeTask(taskId: number, outputPath?: string): Promise<void> {
        if (!this.db) return;
        await this.db.run(
            "UPDATE tasks SET status = 'completed', completed_at = datetime('now'), output_path = ? WHERE id = ?",
            [outputPath || null, taskId]
        );
    }

    async markTaskFailed(taskId: number): Promise<void> {
        if (!this.db) return;
        await this.db.run(
            "UPDATE tasks SET status = 'failed' WHERE id = ?",
            [taskId]
        );
    }

    // --- Layout Operations ---

    async saveLayout(name: string, layoutJson: string): Promise<void> {
        if (!this.db) return;
        const existing = await this.db.get('SELECT id FROM office_layout WHERE name = ?', [name]);
        if (existing) {
            await this.db.run("UPDATE office_layout SET layout_json = ?, updated_at = datetime('now') WHERE name = ?", [layoutJson, name]);
        } else {
            await this.db.run('INSERT INTO office_layout (name, layout_json) VALUES (?, ?)', [name, layoutJson]);
        }
    }

    async loadLayout(name: string = 'default'): Promise<any | null> {
        if (!this.db) return null;
        const row = await this.db.get('SELECT layout_json FROM office_layout WHERE name = ?', [name]);
        return row ? JSON.parse(row.layout_json) : null;
    }

    async close(): Promise<void> {
        if (this.db) await this.db.close();
    }

    // --- Usage Tracking ---
    
    async logUsage(sessionId: string, agentId: string, taskId: number, model: string, promptTokens: number, completionTokens: number): Promise<void> {
        if (!this.db) return;
        await this.db.run(
            'INSERT INTO usage_log (session_id, agent_id, task_id, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?)',
            [sessionId, agentId, taskId, model, promptTokens, completionTokens]
        );
    }

    async getUsageSummary(): Promise<any[]> {
        if (!this.db) return [];
        return this.db.all(`
            SELECT 
                agent_id,
                model,
                DATE(created_at) as date,
                SUM(prompt_tokens) as total_prompt_tokens,
                SUM(completion_tokens) as total_completion_tokens,
                COUNT(*) as task_count
            FROM usage_log 
            GROUP BY agent_id, model, DATE(created_at)
            ORDER BY date DESC
            LIMIT 100
        `);
    }

    async getCostsData(): Promise<any> {
        if (!this.db) return this.emptyCosts();
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const thisMonth = today.substring(0, 7);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.toISOString().substring(0, 7);
        
        // Single query grouped by (agent, model, date) — every breakdown below derives
        // from it so per-model pricing (costOf) applies everywhere consistently.
        const rows = await this.db.all(`
            SELECT
                agent_id,
                model,
                DATE(created_at) as date,
                SUM(prompt_tokens) as prompt_tokens,
                SUM(completion_tokens) as completion_tokens
            FROM usage_log
            GROUP BY agent_id, model, DATE(created_at)
            ORDER BY date DESC
        `);

        const toCost = (rs: any[]) => rs.reduce(
            (acc: number, r: any) => acc + costOf(r.model, r.prompt_tokens || 0, r.completion_tokens || 0), 0);

        const todayRows = rows.filter((r: any) => r.date === today);
        const yesterdayRows = rows.filter((r: any) => r.date === yesterday);
        const thisMonthRows = rows.filter((r: any) => r.date.startsWith(thisMonth));
        const lastMonthRows = rows.filter((r: any) => r.date.startsWith(lastMonth));

        const byAgentMap = new Map<string, { cost: number; tokens: number }>();
        const byModelMap = new Map<string, { cost: number; tokens: number }>();
        const dailyMap = new Map<string, { cost: number; input: number; output: number }>();
        for (const r of rows) {
            const input = r.prompt_tokens || 0;
            const output = r.completion_tokens || 0;
            const cost = costOf(r.model, input, output);

            const a = byAgentMap.get(r.agent_id) || { cost: 0, tokens: 0 };
            a.cost += cost; a.tokens += input + output;
            byAgentMap.set(r.agent_id, a);

            const m = byModelMap.get(r.model) || { cost: 0, tokens: 0 };
            m.cost += cost; m.tokens += input + output;
            byModelMap.set(r.model, m);

            const d = dailyMap.get(r.date) || { cost: 0, input: 0, output: 0 };
            d.cost += cost; d.input += input; d.output += output;
            dailyMap.set(r.date, d);
        }

        const byAgent = [...byAgentMap.entries()].map(([agent, v]) => ({ agent, ...v }));
        const byModel = [...byModelMap.entries()].map(([model, v]) => ({ model, ...v }));
        // rows are ordered date DESC, so dailyMap insertion order is newest-first.
        const daily = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v })).slice(0, 30);

        const thisMonthCost = toCost(thisMonthRows);
        const dailyAvg = daily.length > 0 ? daily.reduce((acc: number, d: any) => acc + d.cost, 0) / daily.length : 0;
        const daysRemaining = 30 - new Date().getDate();

        return {
            today: toCost(todayRows),
            yesterday: toCost(yesterdayRows),
            thisMonth: thisMonthCost,
            lastMonth: toCost(lastMonthRows),
            projected: thisMonthCost + (dailyAvg * daysRemaining),
            budget: 100.0,
            byAgent,
            byModel,
            daily,
            hourly: []
        };
    }

    private emptyCosts(): any {
        return {
            today: 0,
            yesterday: 0,
            thisMonth: 0,
            lastMonth: 0,
            projected: 0,
            budget: 100,
            byAgent: [],
            byModel: [],
            daily: [],
            hourly: []
        };
    }
}