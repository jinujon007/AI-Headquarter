import { Room, Client } from 'colyseus';
import { OfficeState } from '../schema/OfficeState';
import { Agent, Office, OfficeConfig, ConversationMessage } from '@aihq/core';
import * as adapters from '@aihq/adapters';
import { ToolExecutor } from '../tools/ToolExecutor';
import { MemoryStore, estimateRunCost, budgetBlocks } from '../memory/MemoryStore';
import { TaskManager } from '../tasks/TaskManager';
import { CORE_AGENTS, HIRE_DESK_POSITIONS, BOARD_SEATS, DEFAULT_MODELS } from '../config/agents.config';
import type { InferenceAdapter, CompletionRequest } from '@aihq/core';
import type { OfficeEventMap, AgentSummary, AgentStatus, TaskRecord } from '@aihq/types';

// ─── LLM CALL QUEUE ──────────────────────────────────────────────────────────
// Limits concurrent Ollama calls so the queue doesn't pile up under load.
class LLMQueue {
    private queue: Array<() => void> = [];
    private running = 0;
    constructor(private maxConcurrent: number = 2) {}

    async run<T>(fn: () => Promise<T>): Promise<T> {
        if (this.running < this.maxConcurrent) {
            this.running++;
            try {
                return await fn();
            } finally {
                this.running--;
                this.queue.shift()?.();
            }
        }
        return new Promise((resolve, reject) => {
            this.queue.push(() => {
                this.running++;
                fn().then(resolve, reject).finally(() => {
                    this.running--;
                    this.queue.shift()?.();
                });
            });
        });
    }
}

// ─── RETRY WRAPPER ────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1000): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts - 1) {
                await new Promise(r => setTimeout(r, baseDelayMs * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

// ─── MODEL RESOLUTION ─────────────────────────────────────────────────────────
function resolveModel(provider?: string): string {
    const envModel = process.env.OLLAMA_MODEL;
    if (!provider || provider === 'ollama') return envModel || DEFAULT_MODELS.ollama;
    return DEFAULT_MODELS[provider.toLowerCase()] || envModel || DEFAULT_MODELS.ollama;
}

// ─── BATCH STATE ──────────────────────────────────────────────────────────────
interface BatchState {
    total: number;
    completed: number;
    failed: number;
    titles: string[];
    failedTitles: string[];
    failedAgents: string[];
    outputPaths: string[];
    participants: string[];
    topic: string;
    provider?: string;
    apiKey?: string;
}

export interface TeamOutput {
    agentName: string;
    excerpt: string;
}

// Cross-agent context: later specialists in a batch see what teammates already produced,
// so e.g. Dev builds the page from Cleo's actual copy instead of guessing from the title.
export function buildTeamContext(priorOutputs: TeamOutput[]): string {
    if (!priorOutputs.length) return '';
    const blocks = priorOutputs
        .map(p => `--- Output from ${p.agentName} ---\n${p.excerpt}`)
        .join('\n\n');
    return `\n\nWork already completed by your teammates on this project — build directly on it and keep names, claims, and copy consistent:\n${blocks}`;
}

// Picks the file extension for a specialist's deliverable and strips the wrapping small
// models like to add. Matching only at index 0 saved real HTML documents as `.md` whenever
// the model prefixed a stray title line or a ```html fence — a landing page a browser
// renders as plain text is a broken deliverable, which is the whole point of the demo.
// The 500-char window is what separates "document with a preamble" from a markdown file
// that merely mentions HTML further down.
export function normalizeDeliverable(
    rawOutput: string,
    agentId: string,
): { content: string; extension: 'html' | 'js' | 'md' } {
    const unfenced = rawOutput
        .replace(/^\s*```[a-zA-Z]*\s*\n/, '')
        .replace(/\n\s*```\s*$/, '')
        .trim();

    const docIdx = unfenced.search(/<!DOCTYPE html|<html[\s>]/i);
    if (docIdx !== -1 && docIdx < 500) {
        return { content: unfenced.slice(docIdx), extension: 'html' };
    }

    const isCode = agentId === 'dev' && /\b(def |function |import |class )/.test(unfenced);
    return { content: unfenced, extension: isCode ? 'js' : 'md' };
}

// Strips line breaks and control characters from untrusted values before they are
// logged. The /api/logs ring buffer sanitises what the dashboard sees, but console
// output also goes straight to the operator's terminal unfiltered — an agent name or
// model error containing a newline can forge a log line there.
export function safeForLog(value: unknown, max = 200): string {
    const raw = value instanceof Error ? value.message : String(value);
    return raw.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max);
}

export class OfficeRoom extends Room<OfficeState> {
    private static activeRoom: OfficeRoom | null = null;

    // Type-only override: pins every broadcast to the @aihq/types wire contract,
    // so payload drift breaks tsc here instead of silently breaking the dashboard.
    declare broadcast: <K extends keyof OfficeEventMap>(
        type: K,
        message: OfficeEventMap[K],
        options?: object,
    ) => void;

    maxClients = 100;
    private office!: Office;
    private demoTickCount = 0;
    private coreAgents: Map<string, Agent> = new Map();
    private thinkingLocks: Map<string, boolean> = new Map();
    private ollamaAdapter = new adapters.OllamaAdapter(process.env.OLLAMA_URL || 'http://localhost:11434');
    private hireCount = 0;
    private taskManager: TaskManager;
    private pendingBatchTasks: Map<string, BatchState> = new Map();
    private batchIdCounter = 0;
    private toolExecutor = new ToolExecutor();
    private memoryStore = new MemoryStore();
    private sessionId = `session_${Date.now()}`;
    private llmQueue = new LLMQueue(2);

    // Session-level provider — updated on every CEO message so hired agents use the same model
    private sessionProvider?: string;
    private sessionApiKey?: string;

    // CEO conversation history for multi-turn context (last 10 exchanges)
    private ceoHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    constructor() {
      super();
      this.taskManager = new TaskManager(this.memoryStore);
    }

    private furnitureTargets: Record<string, { x: number; y: number; type: string }> = {
        'pa-desk':         { x: 5,  y: 5,  type: 'desk' },
        'dev-desk':        { x: 5,  y: 12, type: 'desk' },
        'researcher-desk': { x: 12, y: 12, type: 'desk' },
        'copywriter-desk': { x: 19, y: 12, type: 'desk' },
        'analyst-desk':    { x: 26, y: 12, type: 'desk' },
        'meeting-table':   { x: 15, y: 5,  type: 'table' },
        'coffee-machine':  { x: 30, y: 25, type: 'appliance' },
        'hire_0-desk': { x: 12, y: 18, type: 'desk' },
        'hire_1-desk': { x: 19, y: 18, type: 'desk' },
        'hire_2-desk': { x: 26, y: 18, type: 'desk' },
        'hire_3-desk': { x: 12, y: 24, type: 'desk' },
        'hire_4-desk': { x: 19, y: 24, type: 'desk' },
        'hire_5-desk': { x: 26, y: 24, type: 'desk' },
    };

    // ─── ADAPTER FACTORY ─────────────────────────────────────────────────────

    private getAdapter(provider?: string, apiKey?: string): InferenceAdapter {
        if (!provider || !apiKey) return this.ollamaAdapter;

        const p = provider.toLowerCase();
        if (p === 'anthropic') return new adapters.AnthropicAdapter(apiKey);

        const PROVIDER_URLS: Record<string, string> = {
            openai:     'https://api.openai.com/v1',
            openrouter: 'https://openrouter.ai/api/v1',
            groq:       'https://api.groq.com/openai/v1',
            gemini:     'https://generativelanguage.googleapis.com/v1beta/openai',
        };

        const baseURL = PROVIDER_URLS[p];
        if (!baseURL) return this.ollamaAdapter;
        return new adapters.OpenAICompatibleAdapter(baseURL, apiKey, p);
    }

    static getActiveRoom(): OfficeRoom | null {
        return OfficeRoom.activeRoom;
    }

    // ─── LIFECYCLE ───────────────────────────────────────────────────────────

    async onCreate(options: any) {
        this.autoDispose = false;
        OfficeRoom.activeRoom = this;
        this.setState(new OfficeState());

        await this.memoryStore.initialize();

        const stale = await this.memoryStore.failStaleTasks();
        if (stale > 0) console.log(`[OfficeRoom] Marked ${stale} stale task(s) from a previous run as failed`);

        const recentTasks = await this.memoryStore.getRecentTasks(50);
        console.log(`[OfficeRoom] Restored ${recentTasks.length} tasks from previous sessions`);

        const config: OfficeConfig = {
            name: 'AI HQ',
            grid: { width: 40, height: 40, tileSize: 16 },
            rooms: [], furniture: [], spawnPoints: [{ x: 10, y: 10 }], zones: []
        };
        this.office = new Office(config);

        // Initialise agents from config file — no hardcoded definitions here
        for (const def of CORE_AGENTS) {
            await this.setupAgent(def.id, def.name, def.role, def.deskPosition, def.rolePrompt, def.communicationStyle, def.breakFrequency, def.capabilities);
        }

        // Stagger think-cycle unlocks to avoid flooding Ollama at startup
        let staggerMs = 60_000;
        for (const id of this.coreAgents.keys()) {
            setTimeout(() => this.thinkingLocks.set(id, false), staggerMs);
            staggerMs += 60_000;
        }

        this.onMessage('command', (client, message) => {
            console.log(`Command from ${client.sessionId}:`, message);
        });

        // Client pulls initial state once its handlers are registered — pushing
        // from onJoin races the client's onMessage registration and gets dropped.
        this.onMessage('sync-request', (client) => {
            this.memoryStore.getRecentTasks(50).then(tasks => client.send('tasks-sync', tasks));
            client.send('agents-sync', this.getAgentList());
        });

this.onMessage('assign-task', async (client, message) => {
    const { title, agentId } = message;
    const targetId = agentId || this.autoAssignAgent();
    const agent = this.coreAgents.get(targetId);
    const agentState = this.state.agents.get(targetId);
    if (agent && agentState) {
        agent.currentTask = title;
        agentState.currentTask = title;
        agentState.action = 'work';
        const taskId = await this.taskManager.createTask(title, targetId);
        this.broadcast('task:created', {
            type: 'task:created',
            task: { id: `task_${taskId}`, title, assignedTo: targetId, status: 'in-progress', createdAt: new Date().toISOString() }
        });
        this.broadcast('agent:status', { type: 'agent:status', agentId: targetId, status: 'working' });
    }
});

        this.setSimulationInterval((delta) => this.update(delta), 100);
    }

    private async setupAgent(
        id: string,
        name: string,
        role: string,
        deskPosition: [number, number, number],
        rolePrompt: string,
        communicationStyle: string,
        breakFrequency: number,
        capabilities: Array<{ name: string; description: string }>,
    ) {
        this.state.createAgent(id, name);
        const state = this.state.agents.get(id);
        if (state) {
            state.x = deskPosition[0];
            state.y = deskPosition[2];
        }

        const coreAgent = new Agent({
            id, name, role, avatar: 'sprite.png',
            deskPosition,
            inference: {
                provider: 'ollama',
                model: process.env.OLLAMA_MODEL || DEFAULT_MODELS.ollama,
                systemPrompt: rolePrompt,
            },
            personality: {
                traits: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.1 },
                communicationStyle: communicationStyle as any,
                workHours: { start: '09:00', end: '17:00' },
                breakFrequency,
            },
            capabilities,
            memory: { shortTermLimit: 50 },
        });

        coreAgent.setInferenceAdapter(this.ollamaAdapter);
        await coreAgent.initialize();

        const previousMemories = await this.memoryStore.loadMemories(id, 20);
        if (previousMemories.length > 0) {
            coreAgent.loadMemories(previousMemories);
            console.log(`[${name}] Loaded ${previousMemories.length} memories`);
        }

        this.coreAgents.set(id, coreAgent);
        this.thinkingLocks.set(id, true);
    }

    private autoAssignAgent(): string {
        for (const [id, agent] of this.coreAgents) {
            if (!agent.currentTask) return id;
        }
        return 'pa';
    }

    // ─── SIMULATION LOOP ─────────────────────────────────────────────────────

    async update(delta: number) {
        this.state.officeTime = new Date().toISOString();

        this.coreAgents.forEach((coreAgent, id) => {
            if (!this.thinkingLocks.get(id) && coreAgent.currentTask) {
                this.thinkingLocks.set(id, true);
                const agentState = this.state.agents.get(id);
                if (!agentState) return;

                const nearbyAgents: { name: string; role: string; distance: number }[] = [];
                this.coreAgents.forEach((other, otherId) => {
                    if (otherId === id) return;
                    const otherState = this.state.agents.get(otherId);
                    if (otherState) {
                        const dist = Math.abs(agentState.x - otherState.x) + Math.abs(agentState.y - otherState.y);
                        nearbyAgents.push({ name: other.config.name, role: other.config.role, distance: dist });
                    }
                });

                this.llmQueue.run(() => coreAgent.think({
                    time: this.state.officeTime,
                    location: `${agentState.x},${agentState.y}`,
                    nearbyAgents,
                    currentTask: coreAgent.currentTask || null,
                    recentMessages: coreAgent.getUnreadMessages(),
                    memories: coreAgent.getRecentMemories(5),
                })).then(async (decision) => {
                    const prevAction = agentState.action;
                    agentState.action = decision.action;
                    if (decision.thought) agentState.thought = decision.thought;

                    if (prevAction !== decision.action) {
                        this.broadcast('agent:status', { type: 'agent:status', agentId: id, status: decision.action });
                    }

                    if (decision.action === 'talk' && decision.message) {
                        const targetName = decision.target || '';
                        let targetId = '';
                        this.coreAgents.forEach((a, aId) => {
                            if (a.config.name.toLowerCase() === targetName.toLowerCase()) targetId = aId;
                        });
                        const targetAgent = this.coreAgents.get(targetId);
                        if (targetAgent) {
                            const msg: ConversationMessage = { from: coreAgent.config.name, to: targetAgent.config.name, content: decision.message, timestamp: this.state.officeTime };
                            targetAgent.receiveMessage(msg);
                            this.broadcast('agent:message', { type: 'agent:message', agentId: id, message: decision.message, targetId });
                            await this.memoryStore.saveMemory(id, { content: `Said to ${targetAgent.config.name}: "${decision.message}"`, type: 'conversation', timestamp: this.state.officeTime, importance: 0.7 }, this.sessionId);
                        }
                        coreAgent.clearInbox();
                    }

                    if (decision.action === 'use_tool' && decision.toolCall) {
                        if (decision.toolCall.name === 'create_task') {
                            const { title, assignee } = decision.toolCall.params;
                            const tId = assignee?.toLowerCase() || this.autoAssignAgent();
                            const tAgent = this.coreAgents.get(tId);
                            const tState = this.state.agents.get(tId);
                            if (tAgent && tState) {
                                tAgent.currentTask = title;
                                tState.currentTask = title;
                                await this.taskManager.createTask(title, tId);
                                this.broadcast('task:created', { type: 'task:created', task: { id: `task_${Date.now()}`, title, assignedTo: tId, status: 'in-progress', createdAt: new Date().toISOString() } });
                            }
                        } else if (decision.toolCall.name === 'hire_agent') {
                            const { name, role } = decision.toolCall.params;
                            await this.hireAgent(name || 'Specialist', role || 'Specialist', this.sessionProvider, this.sessionApiKey);
                        } else {
                            const toolParams = { ...decision.toolCall.params, agentId: id };
                            const result = await this.toolExecutor.execute(decision.toolCall.name, toolParams);
                            this.broadcast('agent:action', { type: 'agent:action', agentId: id, action: decision.toolCall.name, detail: result.success ? result.output.slice(0, 120) : (result.error || 'Tool failed') });
                            coreAgent.addMemory({ content: `Tool ${decision.toolCall.name}: ${result.output.slice(0, 200)}`, type: 'task_result', timestamp: this.state.officeTime, importance: 0.8 });
                        }
                    }

                    setTimeout(() => this.thinkingLocks.set(id, false), 120_000);
                }).catch(err => {
                    console.error(`[${id}] think error:`, err);
                    setTimeout(() => this.thinkingLocks.set(id, false), 120_000);
                });
            }
        });

        // Movement
        const BOUNDS = { minX: 2, maxX: 36, minY: 2, maxY: 36 };
        const clamp = (agent: any) => {
            agent.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, agent.x));
            agent.y = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, agent.y));
        };

        this.demoTickCount++;
        if (this.demoTickCount >= 5) {
            this.demoTickCount = 0;
            this.state.agents.forEach((agent, key) => {
                if (agent.action === 'in-meeting') return;
                const deskKey = `${key}-desk`;
                const target = this.furnitureTargets[deskKey] || { x: 10, y: 10 };

                if (agent.action === 'talk') {
                    let closest: { x: number; y: number } | null = null;
                    let minDist = Infinity;
                    this.state.agents.forEach((other, otherKey) => {
                        if (otherKey === key) return;
                        const dist = Math.abs(agent.x - other.x) + Math.abs(agent.y - other.y);
                        if (dist < minDist) { minDist = dist; closest = { x: other.x, y: other.y + 2 }; }
                    });
                    if (closest && minDist > 2) {
                        const c = closest as { x: number; y: number };
                        if (agent.x < c.x) agent.x++;
                        else if (agent.x > c.x) agent.x--;
                        else if (agent.y < c.y) agent.y++;
                        else if (agent.y > c.y) agent.y--;
                        clamp(agent); return;
                    }
                }

                if (agent.x < target.x) agent.x++;
                else if (agent.x > target.x) agent.x--;
                else if (agent.y < target.y) agent.y++;
                else if (agent.y > target.y) agent.y--;
                clamp(agent);
            });
        }
    }

    // ─── CEO MESSAGE FLOW ────────────────────────────────────────────────────

    public async streamCeoMessage(
        content: string,
        provider: string | undefined,
        apiKey: string | undefined,
        emit: (event: object) => void,
    ): Promise<void> {
        const paState = this.state.agents.get('pa');
        if (!paState) { emit({ type: 'error', message: 'PA agent not available.' }); return; }

        paState.action = 'thinking';
        paState.currentTask = `CEO: ${content.slice(0, 60)}`;
        this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });
        this.broadcast('agent:message', { type: 'agent:message', agentId: 'ceo', message: content, targetId: 'pa' });

        await this.memoryStore.saveMemory('pa', {
            content: `CEO said: "${content}"`,
            type: 'conversation',
            timestamp: new Date().toISOString(),
            importance: 1.0,
        }, this.sessionId);

        const model = resolveModel(provider);

        // Build conversation history context for multi-turn awareness
        const historyContext = this.ceoHistory.length > 0
            ? `\nPrevious conversation context:\n${this.ceoHistory.map(m => `${m.role === 'user' ? 'CEO' : 'Alex'}: ${m.content}`).join('\n')}\n`
            : '';

        // F-05: Structured JSON output — no more substring guessing
        // Roster built dynamically so hired agents can receive work too
        const roster = Array.from(this.coreAgents.entries())
            .filter(([id]) => id !== 'pa')
            .map(([id, a]) => `- ${a.config.name} (id: ${id}): ${a.config.role}`)
            .join('\n');
        const rosterIds = Array.from(this.coreAgents.keys()).filter(id => id !== 'pa').join(', ');
        const systemPrompt = `You are Alex, the PA and Chief of Staff at AI HQ. Your specialists are:
${roster}
${historyContext}
Respond with a JSON object ONLY — no text outside the JSON:
{
  "reply": "2-3 sentence natural response to the CEO",
  "delegates": ["array of specialist IDs to assign work — use the exact ids: ${rosterIds} — empty array if no delegation needed"],
  "hire": {"name": "...", "role": "..."}
}
Include "hire" ONLY when the CEO explicitly asks to hire someone new — omit the field otherwise. Invent a fitting first name if the CEO gave none.

Example — CEO says "Build me a landing page for my bakery":
{"reply": "On it. Ray will research the market, Cleo will write the copy, and Dev will build the page.", "delegates": ["researcher", "copywriter", "dev"]}

Example — CEO says "hire a financial analyst":
{"reply": "Done — Fiona joins as our Financial Analyst. Her desk is being set up now; she can take work from your next command.", "delegates": [], "hire": {"name": "Fiona", "role": "Financial Analyst"}}

Example — CEO says "thanks, looks great":
{"reply": "Glad you like it. Say the word when you want the next thing built.", "delegates": []}`;

        let fullResponse = '';
        let delegates: string[] = [];

        // Budget cap: refuse paid-model work honestly before spending anything.
        const budgetHit = await this.budgetExceeded(model);
        if (budgetHit != null) {
            fullResponse = `Monthly budget $${budgetHit} reached — raise it in Settings to continue with paid models, or switch to the free local Ollama provider.`;
            emit({ type: 'token', agentId: 'pa', token: fullResponse });
            emit({ type: 'done', agentId: 'pa' });
            this.ceoHistory.push({ role: 'user', content });
            this.ceoHistory.push({ role: 'assistant', content: fullResponse });
            this.broadcast('agent:message', { type: 'agent:message', agentId: 'pa', message: fullResponse, targetId: 'ceo' });
            const paIdle = this.state.agents.get('pa');
            if (paIdle) { paIdle.action = 'idle'; paIdle.currentTask = ''; }
            this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'idle' });
            return;
        }

        // Store the session provider only for runs that actually proceed — a
        // budget-refused attempt must not relabel every agent with a paid model.
        if (provider && apiKey) {
            this.sessionProvider = provider;
            this.sessionApiKey = apiKey;
        }

        try {
            const adapter = this.getAdapter(provider, apiKey);

            // Always use complete() for PA — it returns structured JSON.
            // Streaming JSON char-by-char exposes raw `{"reply":` tokens to the CEO chat.
            // We emit the clean parsed reply field as one chunk after the call resolves.
            const result = await withRetry(() =>
                this.llmQueue.run(() => adapter.complete({
                    model,
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }],
                    temperature: 0.4,
                    responseFormat: 'json',
                }))
            );
            const raw = result.content?.trim() || '';
            await this.memoryStore.logUsage(this.sessionId, 'pa', 0, model, result.usage?.prompt || 0, result.usage?.completion || 0);
            const parsed = this.parseStructuredResponse(raw);
            if (parsed) { fullResponse = parsed.reply; delegates = parsed.delegates; }
            else { fullResponse = raw || 'On it.'; }
            // Chat-driven hiring: "hire a financial analyst" spawns a real agent + desk
            if (parsed?.hire?.name && parsed.hire.role) {
                const hired = await this.hireAgent(parsed.hire.name, parsed.hire.role, provider, apiKey);
                if (hired?.error) fullResponse += ` (Couldn't hire: ${hired.error})`;
            }
            // Pre-run cost estimate in the PA acknowledgment — BYOK only ($0 estimates are skipped)
            if (delegates.length > 0) {
                const avg = await this.memoryStore.getAvgTokensPerCall();
                const est = estimateRunCost(delegates.length, model, avg);
                if (est > 0) fullResponse += ` (Estimated cost for this run: ~$${est.toFixed(est < 0.01 ? 4 : 2)})`;
            }
            emit({ type: 'token', agentId: 'pa', token: fullResponse });
            emit({ type: 'done', agentId: 'pa' });
        } catch (err) {
            // Honest failure — do NOT pretend work is being delegated. Log the real
            // cause for operators (this feeds /api/logs and the dashboard Logs page).
            console.error('[PA] model call failed: %s', safeForLog(err instanceof Error ? `${err.message}${err.cause ? ` (${err.cause})` : ''}` : err));
            fullResponse = 'Could not reach the model — check that Ollama is running, or configure an API key in Settings.';
            emit({ type: 'token', agentId: 'pa', token: fullResponse });
            emit({ type: 'done', agentId: 'pa' });
        }

        // Update multi-turn history
        this.ceoHistory.push({ role: 'user', content });
        this.ceoHistory.push({ role: 'assistant', content: fullResponse });
        if (this.ceoHistory.length > 20) this.ceoHistory = this.ceoHistory.slice(-20);

        this.broadcast('agent:message', { type: 'agent:message', agentId: 'pa', message: fullResponse, targetId: 'ceo' });
        await this.delegate(content, delegates, provider, apiKey);
    }

    // Returns the budget cap in USD when a paid call must be refused, else null.
    private async budgetExceeded(model: string): Promise<number | null> {
        const budget = await this.memoryStore.getBudgetUsd();
        if (budget == null) return null;
        const spent = await this.memoryStore.getMonthToDateSpend();
        return budgetBlocks(model, budget, spent) ? budget : null;
    }

    // Map any LLM spelling (name, capitalised id, etc.) to a real agent id.
    // Built from the CURRENT roster so hired agents resolve too. Invalid entries dropped.
    private normalizeDelegates(raw: string[]): string[] {
        const map = new Map<string, string>();
        this.coreAgents.forEach((agent, id) => {
            if (id === 'pa') return;
            map.set(id.toLowerCase(), id);
            map.set(agent.config.name.toLowerCase(), id);
        });
        const out: string[] = [];
        for (const d of raw) {
            const id = map.get(d.trim().toLowerCase());
            if (id && !out.includes(id)) out.push(id);
        }
        return out;
    }

    private parseStructuredResponse(raw: string): { reply: string; delegates: string[]; hire?: { name: string; role: string } } | null {
        // Try strict parse first, then brace-repaired parse — small local models
        // regularly stop before closing the JSON object.
        const match = raw.match(/\{[\s\S]*\}/) || raw.match(/\{[\s\S]*/);
        if (!match) return null; // no JSON at all — caller streams the raw text
        {
            for (const candidate of [match[0], this.repairJson(match[0])]) {
                try {
                    const parsed = JSON.parse(candidate);
                    if (parsed && typeof parsed === 'object') {
                        const delegates = this.normalizeDelegates(Array.isArray(parsed.delegates)
                            ? parsed.delegates.filter((d: unknown) => typeof d === 'string')
                            : []);
                        const hire = parsed.hire && typeof parsed.hire.name === 'string' && typeof parsed.hire.role === 'string'
                            ? { name: parsed.hire.name.trim().slice(0, 50), role: parsed.hire.role.trim().slice(0, 100) }
                            : undefined;
                        // Small models often omit the reply field while still returning
                        // valid delegates/hire — honor the structure, synthesize the words.
                        let reply = typeof parsed.reply === 'string' ? parsed.reply : '';
                        if (!reply) {
                            reply = hire
                                ? `Done — ${hire.name} joins as our ${hire.role}. The desk is being set up now.`
                                : delegates.length > 0
                                    ? 'On it — delegating to the team now.'
                                    : '';
                        }
                        if (reply) return { reply, delegates, hire };
                    }
                } catch { /* try next candidate */ }
            }
        }
        // Fallback: substring match on the raw text. HONESTY RULE: never show raw
        // JSON debris to the CEO — salvage the reply field or use a clean line.
        const fb = this.fallbackSubstringDelegate(raw);
        let reply = fb.reply;
        if (reply.trimStart().startsWith('{')) {
            const replyField = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
            reply = replyField ? replyField[1].replace(/\\"/g, '"') : 'On it — delegating to the team now.';
        }
        return { reply, delegates: this.normalizeDelegates(fb.delegates) };
    }

    // Append the closing brackets/braces a truncated JSON object is missing.
    private repairJson(s: string): string {
        let out = s.trim();
        // Close an unterminated string first
        const quotes = (out.match(/(?<!\\)"/g) || []).length;
        if (quotes % 2 === 1) out += '"';
        const stack: string[] = [];
        let inStr = false;
        for (let i = 0; i < out.length; i++) {
            const c = out[i];
            if (inStr) {
                if (c === '\\') i++;
                else if (c === '"') inStr = false;
            } else if (c === '"') inStr = true;
            else if (c === '{' || c === '[') stack.push(c);
            else if (c === '}' || c === ']') stack.pop();
        }
        while (stack.length) out += stack.pop() === '{' ? '}' : ']';
        return out;
    }

    private fallbackSubstringDelegate(text: string): { reply: string; delegates: string[] } {
        const AGENT_MAP: Record<string, string> = {
            dev: 'dev', developer: 'dev',
            ray: 'researcher', researcher: 'researcher',
            cleo: 'copywriter', copywriter: 'copywriter',
            max: 'analyst', analyst: 'analyst',
        };
        const lower = text.toLowerCase();
        const delegates: string[] = [];
        for (const [keyword, agentId] of Object.entries(AGENT_MAP)) {
            if (lower.includes(keyword) && !delegates.includes(agentId)) delegates.push(agentId);
        }
        return { reply: text, delegates };
    }

    // ─── DELEGATION ──────────────────────────────────────────────────────────

    private async delegate(
        ceoContent: string,
        delegates: string[],
        provider: string | undefined,
        apiKey: string | undefined,
    ): Promise<void> {
        const paState = this.state.agents.get('pa');

        // Validate BEFORE sizing the batch — an invalid id must never inflate batch.total,
        // or the batch never completes and the PA report/board wrapup never fire.
        const valid = delegates.filter(id => this.coreAgents.has(id) && this.state.agents.has(id));

        if (valid.length === 0) {
            setTimeout(() => {
                if (paState) { paState.action = 'idle'; paState.currentTask = ''; }
                this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'idle' });
            }, 500);
            return;
        }

        const batchId = `batch_${++this.batchIdCounter}`;
        this.pendingBatchTasks.set(batchId, {
            total: valid.length,
            completed: 0,
            failed: 0,
            titles: [],
            failedTitles: [],
            failedAgents: [],
            outputPaths: [],
            participants: valid,
            topic: ceoContent,
            provider,
            apiKey,
        });

        const queue: { agentId: string; taskId: number; taskTitle: string }[] = [];
        for (const agentId of valid) {
            const specialist = this.coreAgents.get(agentId)!;
            const specialistState = this.state.agents.get(agentId)!;
            const taskTitle = ceoContent.slice(0, 80);
            specialist.currentTask = taskTitle;
            specialistState.currentTask = taskTitle;
            specialistState.action = 'work';
            const taskId = await this.taskManager.createTask(taskTitle, agentId);
            // Hold the thinking lock while the task runs — otherwise the 100ms think loop
            // fires a redundant agent.think() competing for the LLM queue slots.
            this.thinkingLocks.set(agentId, true);
            this.broadcast('task:created', {
                type: 'task:created',
                task: { id: `task_${taskId}`, title: taskTitle, assignedTo: agentId, status: 'in-progress', createdAt: new Date().toISOString() }
            });
            this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'work' });
            queue.push({ agentId, taskId, taskTitle });
        }

        // Run tasks SEQUENTIALLY in the PA's delegation order, feeding each specialist
        // the outputs of those before it (research → copy → build). Real collaboration,
        // and no contention for the 2-slot LLM queue.
        void (async () => {
            const priorOutputs: TeamOutput[] = [];
            for (const item of queue) {
                const out = await this.runSpecialistTask(
                    item.agentId, item.taskId, item.taskTitle, batchId, provider, apiKey, priorOutputs,
                );
                if (out) priorOutputs.push(out);
            }
        })();

        setTimeout(() => {
            if (paState) { paState.action = 'work'; paState.currentTask = 'Overseeing delegated work'; }
            this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'working' });
        }, 500);
    }

    // ─── SPECIALIST TASK EXECUTION ───────────────────────────────────────────

    private async runSpecialistTask(
        agentId: string,
        taskId: number,
        taskTitle: string,
        batchId?: string,
        provider?: string,
        apiKey?: string,
        priorOutputs?: TeamOutput[],
    ): Promise<TeamOutput | null> {
        const agent = this.coreAgents.get(agentId);
        const agentState = this.state.agents.get(agentId);
        if (!agent || !agentState) return null;

        const agentDef = CORE_AGENTS.find(a => a.id === agentId);
        const systemPrompt = agentDef?.rolePrompt ||
            `You are ${agent.config.name}, a ${agent.config.role}. Complete the assigned task fully. Output only the deliverable.`;

        agentState.action = 'work';
        this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'working' });

        try {
            const model = resolveModel(provider);
            const adapter = this.getAdapter(provider, apiKey);

            // Budget cap: refuse honestly, mark the task failed — never silently proceed.
            const budgetHit = await this.budgetExceeded(model);
            if (budgetHit != null) {
                this.broadcast('agent:message', {
                    type: 'agent:message', agentId,
                    message: `Monthly budget $${budgetHit} reached — raise it in Settings to continue with paid models.`,
                    targetId: 'ceo',
                });
                throw new Error(`Monthly budget $${budgetHit} reached`);
            }

            // Real web research: one search round for agents that have the capability,
            // results injected into the completion prompt. Graceful fallback on failure.
            let searchContext = '';
            if (agent.config.capabilities?.some(c => c.name === 'web_search')) {
                const search = await this.toolExecutor.execute('web_search', { query: taskTitle, agentId });
                this.broadcast('agent:action', {
                    type: 'agent:action', agentId, action: 'web_search',
                    detail: search.success ? search.output.slice(0, 120) : (search.error || 'Search failed'),
                });
                searchContext = search.success && search.output
                    ? `\n\nWeb search results for context:\n${search.output.slice(0, 3000)}`
                    : '\n\n(Web search was unavailable — proceed from your own knowledge and note any claims that need verification.)';
            }

            const teamContext = buildTeamContext(priorOutputs || []);

            const result = await withRetry(() =>
                this.llmQueue.run(() => adapter.complete({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Task: ${taskTitle}${searchContext}${teamContext}\n\nProduce the complete deliverable now.` },
                    ],
                    temperature: 0.7,
                }))
            );

            const output = result.content.trim();
            if (!output) throw new Error('Empty output from specialist');

            const { content: deliverable, extension: ext } = normalizeDeliverable(output, agentId);

            const toolResult = await this.toolExecutor.execute('write_file', {
                content: deliverable, agentId, filename: taskTitle.slice(0, 40), extension: ext,
            });

            // Persist token usage first — the model call happened and cost real money
            // even if writing the deliverable to disk then fails.
            await this.memoryStore.logUsage(this.sessionId, agentId, taskId, model, result.usage?.prompt || 0, result.usage?.completion || 0);

            // A task whose file never landed is a failed task. This previously fell
            // through to completeTask() with an undefined path and told the CEO
            // "Task complete." — the whole promise of the product is real output files.
            // A task whose file never landed is a failed task. This previously fell
            // through to completeTask() with an undefined path and told the CEO
            // "Task complete." — the whole promise of the product is real output files.
            if (!toolResult.success) {
                throw new Error(`Could not write the deliverable: ${toolResult.error || 'unknown write error'}`);
            }

            const outputPath = toolResult.output.replace('File written: ', '').trim();

            await this.taskManager.completeTask(taskId, outputPath);
            agent.currentTask = '';
            agentState.currentTask = '';
            agentState.action = 'idle';

            // Persist memory on task completion (not randomly)
            await this.memoryStore.saveMemory(agentId, {
                content: `Completed task: "${taskTitle}". Output: ${outputPath || 'in-memory'}`,
                type: 'task_result',
                timestamp: new Date().toISOString(),
                importance: 0.9,
            }, this.sessionId);

            this.broadcast('task:completed', {
                type: 'task:completed',
                task: { id: `task_${taskId}`, title: taskTitle, assignedTo: agentId, status: 'completed', outputPath: outputPath || null, completedAt: new Date().toISOString() },
            });
            this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });
            this.broadcast('agent:message', {
                type: 'agent:message', agentId,
                message: `Done. Output at: ${outputPath}`,
                targetId: 'pa',
            });

            if (batchId) this.onTaskComplete(batchId, agentId, taskTitle, outputPath, false);

            // Cap the excerpt so downstream prompts stay small enough for local 3B models.
            return { agentName: agent.config.name, excerpt: output.slice(0, 2500) };

        } catch (err) {
            console.error('[%s] runSpecialistTask error: %s', safeForLog(agentId, 40), safeForLog(err));
            agentState.action = 'idle';
            agentState.currentTask = '';
            agent.currentTask = '';

            await this.taskManager.markTaskFailed(taskId).catch(() => {});
            this.broadcast('task:failed', {
                type: 'task:failed',
                task: { id: `task_${taskId}`, title: taskTitle, assignedTo: agentId, status: 'failed', error: String(err) },
            });
            this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });

            if (batchId) this.onTaskComplete(batchId, agentId, taskTitle, undefined, true);
            return null;
        } finally {
            // Release the thinking lock acquired in delegate()
            this.thinkingLocks.set(agentId, false);
        }
    }

    private onTaskComplete(batchId: string, agentId: string, title: string, outputPath: string | undefined, failed: boolean) {
        const batch = this.pendingBatchTasks.get(batchId);
        if (!batch) return;
        batch.completed++;
        // Succeeded and failed titles are kept apart so the board wrapup and the PA's
        // report to the CEO cannot claim a deliverable that was never produced.
        if (failed) {
            batch.failed++;
            batch.failedTitles.push(title);
            batch.failedAgents.push(agentId);
        } else {
            batch.titles.push(title);
        }
        if (outputPath) batch.outputPaths.push(outputPath);

        if (batch.completed >= batch.total) {
            this.pendingBatchTasks.delete(batchId);
            // F-04: Board meeting runs AFTER tasks complete, lightweight (no extra LLM calls)
            if (batch.participants.length >= 2) {
                this.runLightweightBoardWrapup(batch.participants, batch.topic, batch.titles, batch.failedAgents).catch(console.error);
            }
            this.synthesizeAndReport(batch.titles, batch.failedTitles, batch.outputPaths, batch.topic, batch.provider, batch.apiKey).catch(console.error);
        }
    }

    // ─── BOARD WRAPUP (lightweight — no extra LLM calls) ────────────────────

    private async runLightweightBoardWrapup(participants: string[], topic: string, completedTitles: string[], failedAgents: string[] = []): Promise<void> {
        if (this.isBoardMeetingActive) return;
        this.isBoardMeetingActive = true;

        const seatAssignments: Record<string, { x: number; y: number }> = {};
        participants.forEach((p, i) => {
            if (BOARD_SEATS[i]) seatAssignments[p] = BOARD_SEATS[i];
        });

        console.log('[Board] Wrapup meeting: %s — topic: %s', safeForLog(participants.join(', '), 120), safeForLog(topic, 60));
        this.broadcast('board:started', { type: 'board:started', participants, topic, seatAssignments });

        participants.forEach((p, i) => {
            const agentState = this.state.agents.get(p);
            const agent = this.coreAgents.get(p);
            if (agentState && BOARD_SEATS[i]) {
                agentState.x = BOARD_SEATS[i].x;
                agentState.y = BOARD_SEATS[i].y;
                agentState.action = 'in-meeting';
                this.broadcast('agent:status', { type: 'agent:status', agentId: p, status: 'in-meeting' });
                // Template message — no LLM call. Agents whose task failed say so;
                // they used to announce a deliverable that did not exist.
                const title = completedTitles.find(t => t) || 'my task';
                const msg = failedAgents.includes(p)
                    ? `I could not finish my part of "${topic.slice(0, 40)}".`
                    : `My deliverable for "${title.slice(0, 40)}" is ready.`;
                this.broadcast('agent:message', { type: 'agent:message', agentId: p, message: msg, targetId: 'pa' });
            }
        });

        await new Promise(r => setTimeout(r, 2000));

        const deskReturn: Record<string, { x: number; y: number }> = {};
        participants.forEach(p => {
            const deskKey = `${p}-desk`;
            if (this.furnitureTargets[deskKey]) deskReturn[p] = this.furnitureTargets[deskKey];
        });
        this.broadcast('board:ended', { type: 'board:ended', participants, deskReturn });

        participants.forEach(p => {
            const agentState = this.state.agents.get(p);
            if (agentState) { agentState.action = 'idle'; }
            this.broadcast('agent:status', { type: 'agent:status', agentId: p, status: 'idle' });
        });

        this.isBoardMeetingActive = false;
    }

    private isBoardMeetingActive = false;

    // ─── PA COMPLETION REPORT ────────────────────────────────────────────────

    private async synthesizeAndReport(
        taskTitles: string[],
        failedTitles: string[],
        outputPaths: string[],
        topic: string,
        provider?: string,
        apiKey?: string,
    ): Promise<void> {
        const paState = this.state.agents.get('pa');
        if (paState) paState.action = 'thinking';
        this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });

        const taskList = taskTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
        const fileList = outputPaths.length > 0 ? outputPaths.map(p => `- ${p}`).join('\n') : '(no files)';

        try {
            const model = resolveModel(provider);
            // F-02: use the session's adapter, not hardcoded ollamaAdapter
            const adapter = this.getAdapter(provider, apiKey);

            // Budget cap: skip the paid synthesis call — the catch block sends the free fallback report.
            if (await this.budgetExceeded(model) != null) throw new Error('Budget reached — skipping synthesis call');

            const result = await withRetry(() =>
                this.llmQueue.run(() => adapter.complete({
                    model,
                    messages: [
                        { role: 'system', content: 'You are Alex, the PA. Write a crisp 3-5 sentence completion report to the CEO. Cover: what was delivered, where the files are, and one clear next action if obvious. Prose only, no lists.' },
                        { role: 'user', content: `Original request: "${topic}"\n\nTasks completed:\n${taskList}\n\nOutput files:\n${fileList}` },
                    ],
                    temperature: 0.5,
                }))
            );

            await this.memoryStore.logUsage(this.sessionId, 'pa', 0, model, result.usage?.prompt || 0, result.usage?.completion || 0);

            const report = result.content.trim() || `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`;

            console.log(`[PA] Completion report sent to CEO (${taskTitles.length} task(s))`);
            this.broadcast('agent:message', {
                type: 'agent:message', agentId: 'pa', message: report, targetId: 'ceo', isReport: true,
            });

            // Update multi-turn history with the report
            this.ceoHistory.push({ role: 'assistant', content: `[REPORT] ${report}` });
            if (this.ceoHistory.length > 20) this.ceoHistory = this.ceoHistory.slice(-20);

        } catch {
            this.broadcast('agent:message', {
                type: 'agent:message', agentId: 'pa',
                message: failedTitles.length === 0
                    ? `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`
                    : `${taskTitles.length} of ${taskTitles.length + failedTitles.length} tasks completed; ${failedTitles.length} failed with no output. Check the Tasks page for details.`,
                targetId: 'ceo', isReport: true,
            });
        } finally {
            if (paState) { paState.action = 'idle'; }
            this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'idle' });
        }
    }

    // ─── HIRE AGENT ──────────────────────────────────────────────────────────

    public async hireAgent(name: string, role: string, provider?: string, apiKey?: string): Promise<any> {
        if (this.hireCount >= 6) {
            return { error: 'Office full (max 11 agents)', code: 'office_full' };
        }

        // Reserve the slot synchronously to prevent race conditions on concurrent hire calls
        const slot = this.hireCount++;
        const id = `hire_${slot}`;
        const pos = HIRE_DESK_POSITIONS[slot] || [12, 0, 18];

        this.state.createAgent(id, name);
        const hireState = this.state.agents.get(id);
        if (hireState) { hireState.x = pos[0]; hireState.y = pos[2]; }

        const hireAgentObj = new Agent({
            id, name, role, avatar: 'sprite.png',
            deskPosition: pos,
            inference: {
                provider: 'ollama',
                model: process.env.OLLAMA_MODEL || DEFAULT_MODELS.ollama,
                systemPrompt: `You are ${name}, a ${role} who just joined AI HQ. Be enthusiastic and eager to contribute. Keep responses short.`,
            },
            personality: {
                traits: { openness: 0.9, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.9, neuroticism: 0.2 },
                communicationStyle: 'casual',
                workHours: { start: '09:00', end: '17:00' },
                breakFrequency: 90,
            },
            capabilities: [
                { name: 'code_execute', description: 'Execute JavaScript or Python code' },
                { name: 'web_search',   description: 'Search the web' },
                { name: 'write_file',   description: 'Write a file to output/' },
                { name: 'create_task',  description: 'Create a task' },
            ],
            memory: { shortTermLimit: 50 },
        });

        const effectiveProvider = provider || this.sessionProvider;
        const effectiveApiKey = apiKey || this.sessionApiKey;
        const adapter = this.getAdapter(effectiveProvider, effectiveApiKey);
        hireAgentObj.setInferenceAdapter(adapter);

        // initialize() used to be fire-and-forget with .catch(console.error). When it
        // failed the agent was never registered and no desk ever spawned, yet this method
        // had already returned success — the caller reported a hire that did not exist.
        try {
            await hireAgentObj.initialize();
        } catch (err) {
            console.error('[hire] %s failed to initialize: %s', safeForLog(name, 50), safeForLog(err));
            this.state.agents.delete(id);
            // ponytail: the slot stays consumed. Releasing it would mean decrementing a
            // counter another concurrent hire may already have claimed; burning one of six
            // slots on a rare failure is cheaper than handing two agents the same desk.
            return { error: 'Agent failed to initialize — check that the model provider is reachable.', code: 'init_failed' };
        }

        this.coreAgents.set(id, hireAgentObj);
        this.thinkingLocks.set(id, false);

        this.broadcast('agent:hired', {
            type: 'agent:hired',
            agent: { id, name, role, status: 'idle', provider: effectiveProvider || 'ollama', deskPosition: pos },
        });

        setTimeout(() => {
            this.broadcast('agent:message', {
                type: 'agent:message', agentId: id,
                message: `Hi team. I'm ${name}. Ready to ${role.toLowerCase()}. Assign me a task whenever you need.`,
                targetId: 'all',
            });
        }, 1500);

        return { id, name, role };
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    public getAgentList(): AgentSummary[] {
        return Array.from(this.coreAgents.entries()).map(([id, agent]) => ({
            id,
            name: agent.config.name,
            role: agent.config.role,
            // Schema `action` is a plain string — the values written to it are all AgentStatus
            status: (this.state.agents.get(id)?.action || 'idle') as AgentStatus,
            model: resolveModel(this.sessionProvider),
            provider: this.sessionProvider || 'ollama',
            deskPosition: agent.config.deskPosition || [0, 0, 0],
            currentTask: agent.currentTask || undefined,
        }));
    }

    public async getTaskList(): Promise<TaskRecord[]> {
        try { return await this.taskManager.getTaskList(); } catch { return []; }
    }

    public async getCosts(): Promise<any> {
        try { return await this.memoryStore.getCostsData(); } catch { return []; }
    }

    public async getSettings(): Promise<{ budgetUsd: number | null }> {
        return { budgetUsd: await this.memoryStore.getBudgetUsd() };
    }

    public async setBudgetUsd(value: number | null): Promise<void> {
        await this.memoryStore.setSetting('budget_usd', value == null ? null : String(value));
    }

    // ─── COLYSEUS CALLBACKS ──────────────────────────────────────────────────

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, 'joined');
        // Initial state is sent on 'sync-request' (see onCreate) — pushing here
        // would race the client's handler registration.
    }

    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, 'left');
    }

    async onDispose() {
        console.log('Room disposing — saving agent memories');
        OfficeRoom.activeRoom = null;
        for (const [id, agent] of this.coreAgents) {
            await this.memoryStore.saveMemories(id, agent.memories, this.sessionId);
        }
        await this.memoryStore.close();
    }
}
