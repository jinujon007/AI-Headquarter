import { Room, Client } from 'colyseus';
import { OfficeState } from '../schema/OfficeState';
import { Agent, Office, OfficeConfig, ConversationMessage } from '@aihq/core';
import { OllamaAdapter, OpenAICompatibleAdapter } from '@aihq/adapters';
import { ToolExecutor } from '../tools/ToolExecutor';
import { MemoryStore } from '../memory/MemoryStore';

export class OfficeRoom extends Room<OfficeState> {
    private static activeRoom: OfficeRoom | null = null;

    maxClients = 100;
    private office!: Office;
    private demoTickCount = 0;
    private coreAgents: Map<string, Agent> = new Map();
    private thinkingLocks: Map<string, boolean> = new Map();
    private ollamaAdapter = new OllamaAdapter(process.env.OLLAMA_URL || 'http://localhost:11434');
    private hireCount = 0;
    private activeTaskIds: Map<string, number> = new Map();
    private pendingBatchTasks: Map<string, { total: number; completed: number; titles: string[]; outputPaths: string[] }> = new Map();
    private batchIdCounter = 0;
    private toolExecutor = new ToolExecutor();
    private memoryStore = new MemoryStore();
    private sessionId = `session_${Date.now()}`;

    // T-056: Board meeting sequence
    private isBoardMeetingActive: boolean = false;
    private boardSeats: Array<{ x: number; y: number }> = [
        { x: 13, y: 5 }, 
        { x: 15, y: 4 }, 
        { x: 17, y: 5 }, 
        { x: 13, y: 7 }, 
        { x: 15, y: 8 }, 
        { x: 17, y: 7 }
    ];

    /**
     * Run a board meeting with specified participants and topic
     * @param participants Array of agent IDs to participate
     * @param topic The discussion topic
     */
    private async runBoardMeeting(participants: string[], topic: string): Promise<void> {
        // Guard: if already in a board meeting, return
        if (this.isBoardMeetingActive) {
            return;
        }

        // Set flag to prevent concurrent meetings
        this.isBoardMeetingActive = true;

        // Prepare list of agents in meeting (PA + participants)
        const inMeeting = ['pa', ...participants];

        // Broadcast board:started event with seat assignments
        const seatAssignments: Record<string, { x: number; y: number }> = {};
        participants.forEach((participant, index) => {
            if (this.boardSeats[index]) {
                seatAssignments[participant] = this.boardSeats[index];
            }
        });

        this.broadcast('board:started', {
            type: 'board:started',
            participants,
            topic,
            seatAssignments
        });

        // Move each agent to their board seat and set status to 'in-meeting'
        participants.forEach((participant, index) => {
            const agent = this.coreAgents.get(participant);
            const agentState = this.state.agents.get(participant);
            if (agent && agentState && this.boardSeats[index]) {
                // Move agent to board seat
                agentState.x = this.boardSeats[index].x;
                agentState.y = this.boardSeats[index].y;
                // Set action to 'in-meeting'
                agentState.action = 'in-meeting';
                // Broadcast status update
                this.broadcast('agent:status', {
                    type: 'agent:status',
                    agentId: participant,
                    status: 'in-meeting'
                });
            }
        });

        // PA opens the meeting
        const paState = this.state.agents.get('pa');
        if (paState) {
            paState.action = 'in-meeting';
            this.broadcast('agent:status', {
                type: 'agent:status',
                agentId: 'pa',
                status: 'in-meeting'
            });
            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId: 'pa',
                message: `Let's begin the board meeting on "${topic}". I'll turn to each specialist for their input.`,
                targetId: 'pa'
            });
        }

        // Each specialist gets one Ollama call for their contribution
        for (const [index, participant] of participants.entries()) {
            const specialist = this.coreAgents.get(participant);
            const specialistState = this.state.agents.get(participant);
            if (specialist && specialistState) {
                try {
                    // Generate specialist contribution using Ollama
                    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
                    const result = await this.ollamaAdapter.complete({
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: `You are ${specialist.config.name}, a ${specialist.config.role}. Provide a brief 2-sentence contribution to the board meeting discussion on: "${topic}". Be professional and concise.`
                            },
                            {
                                role: 'user',
                                content: `Please share your thoughts on this topic for the board meeting.`
                            }
                        ],
                        temperature: 0.7
                    });

                    const contribution = result.content.trim() || `I have nothing to add on this topic.`;
                    
                    // Broadcast specialist message
                    this.broadcast('agent:message', {
                        type: 'agent:message',
                        agentId: participant,
                        message: contribution,
                        targetId: 'pa'
                    });

                    // Small delay between contributions for realism
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`[BoardMeeting] Error getting contribution from ${participant}:`, error);
                    // Fallback message
                    this.broadcast('agent:message', {
                        type: 'agent:message',
                        agentId: participant,
                        message: `I apologize, I'm having trouble formulating my thoughts on this topic right now.`,
                        targetId: 'pa'
                    });
                }
            }
        }

        // PA closes the meeting
        if (paState) {
            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId: 'pa',
                message: `Thank you everyone for your input. The board meeting on "${topic}" is now concluded.`,
                targetId: 'pa'
            });
        }

        // Broadcast board:ended event with desk return positions
        const deskReturn: Record<string, { x: number; y: number }> = {};
        participants.forEach(participant => {
            const deskKey = `${participant}-desk`;
            if (this.furnitureTargets[deskKey]) {
                deskReturn[participant] = this.furnitureTargets[deskKey];
            }
        });

        this.broadcast('board:ended', {
            type: 'board:ended',
            participants,
            deskReturn
        });

        // Reset agents to 'work' action and return to their desks
        participants.forEach((participant, index) => {
            const agent = this.coreAgents.get(participant);
            const agentState = this.state.agents.get(participant);
            if (agent && agentState) {
                agentState.action = 'work';
                // Return to desk position will happen naturally via movement loop
                this.broadcast('agent:status', {
                    type: 'agent:status',
                    agentId: participant,
                    status: 'work'
                });
            }
        });

        // Reset PA to work
        if (paState) {
            paState.action = 'work';
            this.broadcast('agent:status', {
                type: 'agent:status',
                agentId: 'pa',
                status: 'work'
            });
        }

        // Reset meeting flag
        this.isBoardMeetingActive = false;
    }

    // Grid desk positions keyed by agent id
    private furnitureTargets: Record<string, { x: number; y: number; type: string }> = {
        'pa-desk':         { x: 5,  y: 5,  type: 'desk' },
        'dev-desk':        { x: 5,  y: 12, type: 'desk' },
        'researcher-desk': { x: 12, y: 12, type: 'desk' },
        'copywriter-desk': { x: 19, y: 12, type: 'desk' },
        'analyst-desk':    { x: 26, y: 12, type: 'desk' },
        'meeting-table':   { x: 15, y: 5,  type: 'table' },
        'coffee-machine':  { x: 30, y: 25, type: 'appliance' },
        // Dynamic hire desks
        'hire_0-desk': { x: 12, y: 18, type: 'desk' },
        'hire_1-desk': { x: 19, y: 18, type: 'desk' },
        'hire_2-desk': { x: 26, y: 18, type: 'desk' },
        'hire_3-desk': { x: 12, y: 24, type: 'desk' },
        'hire_4-desk': { x: 19, y: 24, type: 'desk' },
    };

    // T-046: BYOK adapter switching
    private getAdapter(provider?: string, apiKey?: string): OllamaAdapter | OpenAICompatibleAdapter {
        if (!provider || !apiKey) return this.ollamaAdapter;

        const PROVIDER_URLS: Record<string, string> = {
            openai:      'https://api.openai.com/v1',
            openrouter:  'https://openrouter.ai/api/v1',
            groq:        'https://api.groq.com/openai/v1',
            gemini:      'https://generativelanguage.googleapis.com/v1beta/openai',
            anthropic:   'https://openrouter.ai/api/v1',  // route Claude via OpenRouter
        };

        const baseURL = PROVIDER_URLS[provider.toLowerCase()];
        if (!baseURL) return this.ollamaAdapter;

        return new OpenAICompatibleAdapter(baseURL, apiKey, provider.toLowerCase());
    }

    static getActiveRoom(): OfficeRoom | null {
        return OfficeRoom.activeRoom;
    }

    async onCreate(options: any) {
        // WS events emitted by this room:
        // agent:status, agent:message, agent:action, agent:hired
        // task:created, task:completed
        // board:started { participants, topic, seatAssignments }
        // board:ended   { participants, deskReturn }
        
        this.autoDispose = false;   // persist room when no clients connected
        OfficeRoom.activeRoom = this;
        this.setState(new OfficeState());

        await this.memoryStore.initialize();
        
        // Load and log restored tasks
        const recentTasks = await this.memoryStore.getRecentTasks(50);
        console.log(`[OfficeRoom] Restored ${recentTasks.length} tasks from previous sessions`);

        const config: OfficeConfig = {
            name: 'AI HQ',
            grid: { width: 40, height: 40, tileSize: 16 },
            rooms: [],
            furniture: [],
            spawnPoints: [{ x: 10, y: 10 }],
            zones: []
        };
        this.office = new Office(config);

        // Setup agent with position [x, y, z] where x→grid-x, z→grid-y
        const setupCoreAgent = async (
            id: string,
            name: string,
            role: string,
            deskPosition: [number, number, number]
        ) => {
            this.state.createAgent(id, name);
            const state = this.state.agents.get(id);
            if (state) {
                state.x = deskPosition[0];
                state.y = deskPosition[2];
            }

            const coreAgent = new Agent({
                id, name, role, avatar: 'sprite.png',
                inference: {
                    provider: 'ollama',
                    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
                    systemPrompt: `You are ${name}, a ${role} at AI HQ. You work for the CEO. Be concise and professional. Keep thoughts under 2 sentences.`,
                },
                personality: {
                    traits: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.1 },
                    communicationStyle: role.includes('Developer') ? 'technical' : 'casual',
                    workHours: { start: '09:00', end: '17:00' },
                    breakFrequency: 120
                },
                capabilities: [
                    { name: 'code_execute',  description: 'Execute JavaScript code' },
                    { name: 'web_search',    description: 'Search the web for information' },
                    { name: 'write_note',    description: 'Write a note or file' },
                    { name: 'create_task',   description: 'Create a task for the team. Params: { title: string, assignee: string }' },
                    { name: 'hire_agent',    description: 'Hire a new team member. Params: { name: string, role: string }' }
                ],
                memory: { shortTermLimit: 50 }
            } as any);

            coreAgent.setInferenceAdapter(this.ollamaAdapter);
            await coreAgent.initialize();

            const previousMemories = await this.memoryStore.loadMemories(id, 20);
            if (previousMemories.length > 0) {
                coreAgent.loadMemories(previousMemories);
                console.log(`[${name}] Loaded ${previousMemories.length} memories`);
            }

            this.coreAgents.set(id, coreAgent);
            this.thinkingLocks.set(id, true);  // start locked; unlocked below with stagger
        };

        // AIHQ default agents
        await setupCoreAgent('pa',         'Alex', 'PA / Orchestrator', [-6, 0, -5]);
        await setupCoreAgent('dev',        'Dev',  'Developer',         [-4, 0,  2]);
        await setupCoreAgent('researcher', 'Ray',  'Researcher',        [ 0, 0,  2]);
        await setupCoreAgent('copywriter', 'Cleo', 'Copywriter',        [ 4, 0,  2]);
        await setupCoreAgent('analyst',    'Max',  'Market Analyst',    [ 8, 0,  2]);

        // Stagger think cycle unlocks: one agent every 60s so Ollama isn't flooded at startup
        let staggerMs = 60000;
        for (const id of this.coreAgents.keys()) {
            setTimeout(() => this.thinkingLocks.set(id, false), staggerMs);
            staggerMs += 60000;
        }

        // ─── MESSAGE HANDLERS ───

        this.onMessage('ceo:message', async (client, message) => {
            const response = await this.receiveCeoMessage(message.content || '');
            client.send('pa:response', { message: response });
        });

        this.onMessage('command', (client, message) => {
            console.log(`Command from ${client.sessionId}:`, message);
        });

        this.onMessage('assign-task', (client, message) => {
            const { title, agentId } = message;
            const targetId = agentId || this.autoAssignAgent();
            const agent = this.coreAgents.get(targetId);
            const agentState = this.state.agents.get(targetId);

            if (agent && agentState) {
                agent.currentTask = title;
                agentState.currentTask = title;
                agentState.action = 'work';
                this.memoryStore.createTask(title, targetId);
                this.broadcast('task:created', {
                    type: 'task:created',
                    task: {
                        id: `task_${Date.now()}`,
                        title,
                        assignedTo: targetId,
                        status: 'in-progress',
                        createdAt: new Date().toISOString(),
                    }
                });
                this.broadcast('agent:status', { type: 'agent:status', agentId: targetId, status: 'working' });
            }
        });

        this.setSimulationInterval((delta) => this.update(delta), 100);
    }

    private autoAssignAgent(): string {
        for (const [id, agent] of this.coreAgents) {
            if (!agent.currentTask) return id;
        }
        return 'pa';
    }

    async update(delta: number) {
        if (Math.random() < 0.02) {
            console.log(`[AIHQ] Agents: ${this.state.agents.size} | Session: ${this.sessionId}`);
        }

        this.state.officeTime = new Date().toISOString();

        // ─── AGENT THINK CYCLE (only when agent has active task) ───
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

                coreAgent.think({
                    time: this.state.officeTime,
                    location: `${agentState.x},${agentState.y}`,
                    nearbyAgents,
                    currentTask: coreAgent.currentTask || null,
                    recentMessages: coreAgent.getUnreadMessages(),
                    memories: coreAgent.getRecentMemories(5)
                }).then(async (decision) => {
                    const prevAction = agentState.action;
                    agentState.action = decision.action;

                    if (decision.thought) agentState.thought = decision.thought;

                    // Emit status change
                    if (prevAction !== decision.action) {
                        this.broadcast('agent:status', {
                            type: 'agent:status',
                            agentId: id,
                            status: decision.action,
                        });
                    }

                    // ─── TALK ACTION ───
                    if (decision.action === 'talk' && decision.message) {
                        const targetName = decision.target || '';
                        let targetId = '';
                        this.coreAgents.forEach((a, aId) => {
                            if (a.config.name.toLowerCase() === targetName.toLowerCase()) targetId = aId;
                        });

                        const targetAgent = this.coreAgents.get(targetId);
                        if (targetAgent) {
                            const msg: ConversationMessage = {
                                from: coreAgent.config.name,
                                to: targetAgent.config.name,
                                content: decision.message,
                                timestamp: this.state.officeTime
                            };
                            targetAgent.receiveMessage(msg);

                            this.broadcast('agent:message', {
                                type: 'agent:message',
                                agentId: id,
                                message: decision.message,
                                targetId,
                            });

                            await this.memoryStore.saveMemory(id, {
                                content: `Said to ${targetAgent.config.name}: "${decision.message}"`,
                                type: 'conversation',
                                timestamp: this.state.officeTime,
                                importance: 0.7
                            }, this.sessionId);
                        }
                        coreAgent.clearInbox();
                    }

                    // ─── TOOL EXECUTION ───
                    if (decision.action === 'use_tool' && decision.toolCall) {
                        if (decision.toolCall.name === 'create_task') {
                            const { title, assignee } = decision.toolCall.params;
                            const targetId = assignee?.toLowerCase() || this.autoAssignAgent();
                            const targetAgent = this.coreAgents.get(targetId);
                            const targetState = this.state.agents.get(targetId);

                            if (targetAgent && targetState) {
                                targetAgent.currentTask = title;
                                targetState.currentTask = title;
                                await this.memoryStore.createTask(title, targetId);
                                this.broadcast('task:created', {
                                    type: 'task:created',
                                    task: {
                                        id: `task_${Date.now()}`,
                                        title,
                                        assignedTo: targetId,
                                        status: 'in-progress',
                                        createdAt: new Date().toISOString(),
                                    }
                                });
                            }
                        } else if (decision.toolCall.name === 'hire_agent') {
                            const params = decision.toolCall.params;
                            const newName = params.name || ['Charlie', 'Diana', 'Eve', 'Frank', 'Grace'][this.hireCount % 5];
                            const newRole = params.role || 'Specialist';
                            this.hireAgent(newName, newRole);
                         } else {
                             const toolParams = { ...decision.toolCall.params, agentId: id };
                             const result = await this.toolExecutor.execute(
                                 decision.toolCall.name,
                                 toolParams
                             );

                            this.broadcast('agent:action', {
                                type: 'agent:action',
                                agentId: id,
                                action: decision.toolCall.name,
                                detail: result.success ? result.output.slice(0, 120) : (result.error || 'Tool failed'),
                            });

                            coreAgent.addMemory({
                                content: `Tool ${decision.toolCall.name}: ${result.output.slice(0, 200)}`,
                                type: 'task_result',
                                timestamp: this.state.officeTime,
                                importance: 0.8
                            });
                        }
                    }

                    // Persist memories periodically
                    if (Math.random() < 0.3) {
                        const recentMemories = coreAgent.memories.slice(-3);
                        await this.memoryStore.saveMemories(id, recentMemories, this.sessionId);
                    }

                    setTimeout(() => this.thinkingLocks.set(id, false), 120000);

                }).catch(err => {
                    console.error(`[${id}] think error:`, err);
                    setTimeout(() => this.thinkingLocks.set(id, false), 120000);
                });
            }
        });

        // ─── MOVEMENT ───
        const BOUNDS = { minX: 2, maxX: 36, minY: 2, maxY: 36 };
        const clamp = (agent: any) => {
            agent.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, agent.x));
            agent.y = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, agent.y));
        };

         this.demoTickCount++;
         if (this.demoTickCount >= 5) {
             this.demoTickCount = 0;
             this.state.agents.forEach((agent, key) => {
                 // Skip movement for agents in meetings
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
                         clamp(agent);
                         return;
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

    // ─── PUBLIC API METHODS ───

    public getAgentList(): any[] {
        return Array.from(this.coreAgents.entries()).map(([id, agent]) => ({
            id,
            name: agent.config.name,
            role: agent.config.role,
            status: this.state.agents.get(id)?.action || 'idle',
            model: (agent.config as any).inference?.model || 'unknown',
            provider: 'ollama',
            deskPosition: (agent.config as any).deskPosition || [0, 0, 0],
            currentTask: agent.currentTask || undefined,
        }));
    }

    public hireAgent(name: string, role: string): any {
        const id = `hire_${this.hireCount}`;
        if (this.hireCount >= 5 || this.coreAgents.has(id)) {
            return { error: 'Office full (max 10 agents)' };
        }

        this.state.createAgent(id, name);
        const hireState = this.state.agents.get(id);
        if (hireState) { hireState.x = 20; hireState.y = 2; }

        const hireAgent = new Agent({
            id, name, role, avatar: 'sprite.png',
            inference: {
                provider: 'ollama',
                model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
                systemPrompt: `You are ${name}, a ${role} who just joined AI HQ. Be enthusiastic and eager to contribute. Keep thoughts short.`,
            },
            personality: {
                traits: { openness: 0.9, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.9, neuroticism: 0.2 },
                communicationStyle: 'casual',
                workHours: { start: '09:00', end: '17:00' },
                breakFrequency: 90
            },
            capabilities: [
                { name: 'code_execute', description: 'Execute JavaScript code' },
                { name: 'web_search',   description: 'Search the web' },
                { name: 'write_note',   description: 'Write a note or file' },
                { name: 'create_task',  description: 'Create a task' }
            ],
            memory: { shortTermLimit: 50 }
        } as any);

        hireAgent.setInferenceAdapter(this.ollamaAdapter);
        hireAgent.initialize().then(() => {
            this.coreAgents.set(id, hireAgent);
            this.thinkingLocks.set(id, false);
            this.hireCount++;

            this.broadcast('agent:hired', {
                type: 'agent:hired',
                agent: { id, name, role, status: 'idle', provider: 'ollama', deskPosition: [0, 0, 0] }
            });
        }).catch(console.error);

        return { id, name, role };
    }

    public async streamCeoMessage(
        content: string,
        provider: string | undefined,
        apiKey: string | undefined,
        emit: (event: object) => void,
    ): Promise<void> {
        const paState = this.state.agents.get('pa');
        if (!paState) {
            emit({ type: 'error', message: 'PA agent not available.' });
            return;
        }

        paState.action = 'thinking';
        this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });

        const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
        const systemPrompt = `You are Alex, the PA and orchestrator. Respond to the CEO's command in 2-3 natural sentences. If you need specialists, briefly mention who (Dev, Ray, Cleo, or Max) and why. Be direct and confident.`;

        let fullResponse = '';

        try {
            if (!provider || !apiKey) {
                // Ollama — stream tokens
                const streamPromise = this.ollamaAdapter.stream({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: content },
                    ],
                    temperature: 0.7,
                    onToken: (token) => emit({ type: 'token', agentId: 'pa', token }),
                    onDone: () => emit({ type: 'done', agentId: 'pa' }),
                });
                fullResponse = await streamPromise;
            } else {
                // BYOK — use streaming if available, otherwise complete() then emit as single chunk
                const adapter = this.getAdapter(provider, apiKey);
                if ('stream' in adapter && typeof (adapter as any).stream === 'function') {
                    // Stream BYOK
                    const streamPromise = (adapter as any).stream({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: content },
                        ],
                        temperature: 0.7,
                        onToken: (token) => emit({ type: 'token', agentId: 'pa', token }),
                        onDone: () => emit({ type: 'done', agentId: 'pa' }),
                    });
                    fullResponse = await streamPromise;
                } else {
                    // Fallback to complete() for adapters without streaming
                    const result = await adapter.complete({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: content },
                        ],
                        temperature: 0.7,
                    });
                    fullResponse = result.content?.trim() || 'On it.';
                    emit({ type: 'token', agentId: 'pa', token: fullResponse });
                    emit({ type: 'done', agentId: 'pa' });
                }
            }
        } catch {
            fullResponse = 'Got it. Analysing and delegating. Stand by.';
            emit({ type: 'token', agentId: 'pa', token: fullResponse });
            emit({ type: 'done', agentId: 'pa' });
        }

        // Broadcast PA message to WS clients (activity feed)
        this.broadcast('agent:message', {
            type: 'agent:message',
            agentId: 'pa',
            message: fullResponse,
            targetId: 'ceo',
        });

        // Delegate routing to existing method — re-runs PA inference but handles all task creation correctly
        // Accept the double inference cost for now (Option 2 in v2 will eliminate it)
        try {
            await this.receiveCeoMessage(content, provider, apiKey);
        } catch {
            // routing failure is non-fatal — PA already responded
        }
    }

    public async receiveCeoMessage(content: string, provider?: string, apiKey?: string): Promise<string> {
        const pa = this.coreAgents.get('pa');
        const paState = this.state.agents.get('pa');

        if (pa && paState) {
            paState.action = 'thinking';
            paState.currentTask = `CEO: ${content.slice(0, 60)}`;

            this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });
            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId: 'ceo',
                message: content,
                targetId: 'pa',
            });

            await this.memoryStore.saveMemory('pa', {
                content: `CEO said: "${content}"`,
                type: 'conversation',
                timestamp: new Date().toISOString(),
                importance: 1.0,
            }, this.sessionId);

            try {
                const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
                const adapter = this.getAdapter(provider, apiKey);
                const result = await adapter.complete({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are Alex, PA and Chief of Staff at AI HQ. The CEO just gave you a directive. Respond in 1-2 sentences: acknowledge the task and name which team member(s) you will delegate to. Available team: Dev (developer), Ray (researcher), Cleo (copywriter), Max (market analyst). Be concise and professional.`,
                        },
                        { role: 'user', content },
                    ],
                    temperature: 0.7,
                });

                const response = result.content.trim() || `Got it. I'll get the right team on this immediately.`;

                const AGENT_MAP: Record<string, string> = {
                    'dev': 'dev', 'developer': 'dev',
                    'ray': 'researcher', 'researcher': 'researcher',
                    'cleo': 'copywriter', 'copywriter': 'copywriter',
                    'max': 'analyst', 'analyst': 'analyst',
                };
                const mentionedAgents: string[] = [];
                const lowerResponse = response.toLowerCase();
                for (const [keyword, agentId] of Object.entries(AGENT_MAP)) {
                    if (lowerResponse.includes(keyword) && !mentionedAgents.includes(agentId)) {
                        mentionedAgents.push(agentId);
                    }
                }
                
                // T-045: Create batch tracking for synthesis
                const batchId = `batch_${++this.batchIdCounter}`;
                this.pendingBatchTasks.set(batchId, {
                    total: mentionedAgents.length,
                    completed: 0,
                    titles: [],
                    outputPaths: [],
                });
                
                 // T-056: Trigger board meeting if 2+ agents mentioned and no meeting active
                 if (mentionedAgents.length >= 2 && !this.isBoardMeetingActive) {
                     this.runBoardMeeting(mentionedAgents, content).catch(err => console.error('[BoardMeeting] error:', err));
                 }
                 
                 for (const agentId of mentionedAgents) {
                    const specialist = this.coreAgents.get(agentId);
                    const specialistState = this.state.agents.get(agentId);
                    if (specialist && specialistState) {
                        const taskTitle = content.slice(0, 80);
                        specialist.currentTask = taskTitle;
                        specialistState.currentTask = taskTitle;
                        specialistState.action = 'work';
                        const taskId = await this.memoryStore.createTask(taskTitle, agentId);
                        this.activeTaskIds.set(agentId, taskId);
                        this.thinkingLocks.set(agentId, false);
                        this.broadcast('task:created', {
                            type: 'task:created',
                            task: {
                                id: `task_${taskId}`,
                                title: taskTitle,
                                assignedTo: agentId,
                                status: 'in-progress',
                                createdAt: new Date().toISOString(),
                            }
                        });
                        this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'work' });
                        this.runSpecialistTask(agentId, taskId, taskTitle, batchId, provider, apiKey);
                    }
                }

                setTimeout(() => {
                    if (paState) {
                        paState.action = 'work';
                        paState.currentTask = mentionedAgents.length > 0 ? 'Overseeing delegated work' : '';
                    }
                    this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'working' });
                    this.broadcast('agent:message', { type: 'agent:message', agentId: 'pa', message: response, targetId: 'ceo' });
                }, 500);

                return response;
            } catch (err) {
                console.error('[PA] inference error:', err);
                const fallback = `Got it. Delegating to the right team now. Stand by.`;
                setTimeout(() => {
                    if (paState) { paState.action = 'idle'; }
                    this.broadcast('agent:message', { type: 'agent:message', agentId: 'pa', message: fallback, targetId: 'ceo' });
                }, 500);
                return fallback;
            }
        }

        return 'PA agent is not available.';
    }

    private async runSpecialistTask(agentId: string, taskId: number, taskTitle: string, batchId?: string, provider?: string, apiKey?: string): Promise<void> {
        const agent = this.coreAgents.get(agentId);
        const agentState = this.state.agents.get(agentId);
        if (!agent || !agentState) return;

        const ROLE_PROMPTS: Record<string, string> = {
            dev:        'You are Dev, a senior developer. Produce only the deliverable — complete, runnable code with no explanation, no preamble, no markdown fences. If the task is a web page, output valid HTML starting with <!DOCTYPE html>. If the task is a script, output only the script.',
            researcher: 'You are Ray, a researcher. Produce only the deliverable — a complete research brief with headers, key findings, cited specifics, and source URLs where relevant. No preamble.',
            copywriter: 'You are Cleo, a copywriter. Produce only the deliverable — the full copy text. No preamble, no "here is the copy", no meta-commentary. Just the content.',
            analyst:    'You are Max, a market analyst. Produce only the deliverable — a complete analysis with market sizing, competitor landscape, and 3 actionable recommendations. No preamble.',
        };

        const systemPrompt = ROLE_PROMPTS[agentId] ||
            `You are ${agent.config.name}, a ${agent.config.role}. Complete the assigned task fully. Output only the deliverable.`;

        agentState.action = 'work';
        this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'working' });

        try {
            const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
            const adapter = this.getAdapter(provider, apiKey);
            const result = await adapter.complete({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Task: ${taskTitle}\n\nProduce the complete deliverable now.` },
                ],
                temperature: 0.7,
            });

            const output = result.content.trim();
            if (!output) throw new Error('Empty output from specialist');

            // T-058: Detect file extension for output
            const isHTML = output.trimStart().startsWith('<!DOCTYPE') || output.trimStart().startsWith('<html');
            const isCode = !isHTML && agentId === 'dev' && (output.includes('def ') || output.includes('function ') || output.includes('import ') || output.includes('class '));
            const ext = isHTML ? 'html' : isCode ? 'js' : 'md';

            const toolResult = await this.toolExecutor.execute('write_file', {
                content: output,
                agentId,
                filename: taskTitle.slice(0, 40),
                extension: ext,
            });

            // Log token usage
            await this.memoryStore.logUsage(this.sessionId, agentId, taskId, model, result.usage?.prompt || 0, result.usage?.completion || 0);

             const outputPath = toolResult.success
                ? toolResult.output.replace('File written: ', '').trim()
                : undefined;

            // T-042: task completion
            await this.memoryStore.completeTask(taskId);
            this.activeTaskIds.delete(agentId);

            agent.currentTask = '';
            agentState.currentTask = '';
            agentState.action = 'idle';

            this.broadcast('task:completed', {
                type: 'task:completed',
                task: {
                    id: `task_${taskId}`,
                    title: taskTitle,
                    assignedTo: agentId,
                    status: 'completed',
                    outputPath: outputPath || null,
                    completedAt: new Date().toISOString(),
                },
            });

            // T-045: batch completion tracking
            if (batchId && this.pendingBatchTasks.has(batchId)) {
                const batch = this.pendingBatchTasks.get(batchId)!;
                batch.completed++;
                batch.titles.push(taskTitle);
                if (outputPath) batch.outputPaths.push(outputPath);
                if (batch.completed >= batch.total) {
                    this.pendingBatchTasks.delete(batchId);
                    await this.synthesizeAndReport(batch.titles, batch.outputPaths);
                }
            }

            this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });
            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId,
                message: toolResult.success
                    ? `Task complete. Output at: ${outputPath}`
                    : `Task complete. Output written.`,
                targetId: 'pa',
            });

            await this.memoryStore.saveMemory(agentId, {
                content: `Completed task: "${taskTitle}". Output: ${outputPath || 'in-memory'}`,
                type: 'task_result',
                timestamp: new Date().toISOString(),
                importance: 0.9,
            }, this.sessionId);

        } catch (err) {
            console.error(`[${agentId}] runSpecialistTask error:`, err);
            agentState.action = 'idle';
            agentState.currentTask = '';
            agent.currentTask = '';
            this.broadcast('agent:status', { type: 'agent:status', agentId, status: 'idle' });
        }
    }

    // T-045: Synthesize completion report and send to CEO
    private async synthesizeAndReport(taskTitles: string[], outputPaths: string[]): Promise<void> {
        const paState = this.state.agents.get('pa');
        if (paState) { paState.action = 'thinking'; }
        this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'thinking' });

        const taskList = taskTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
        const fileList = outputPaths.length > 0
            ? outputPaths.map(p => `- ${p}`).join('\n')
            : '(no files)';

        try {
            const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
            const result = await this.ollamaAdapter.complete({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are Alex, the PA. Your team just completed a batch of tasks. Write a crisp, professional completion report to the CEO. 3-5 sentences. Cover: what was delivered, where to find the files, and one clear next action if obvious. No bullet lists — flowing prose only.',
                    },
                    {
                        role: 'user',
                        content: `Tasks completed:\n${taskList}\n\nOutput files:\n${fileList}\n\nWrite the completion report.`,
                    },
                ],
                temperature: 0.6,
            });

            const report = result.content.trim() || `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`;

            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId: 'pa',
                message: report,
                targetId: 'ceo',
                isReport: true,
            });
        } catch {
            this.broadcast('agent:message', {
                type: 'agent:message',
                agentId: 'pa',
                message: `All ${taskTitles.length} tasks completed. Check the Tasks page for output files.`,
                targetId: 'ceo',
                isReport: true,
            });
        } finally {
            if (paState) { paState.action = 'idle'; }
            this.broadcast('agent:status', { type: 'agent:status', agentId: 'pa', status: 'idle' });
        }
    }

    public async getTaskList(): Promise<any[]> {
        try {
            return await this.memoryStore.getTasks();
        } catch {
            return [];
        }
    }

    public async getCosts(): Promise<any[]> {
        try {
            return await this.memoryStore.getUsageSummary();
        } catch {
            return [];
        }
    }

    // ─── LIFECYCLE ───

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, 'joined');
        this.memoryStore.getRecentTasks(50).then(tasks => {
            client.send('tasks-sync', tasks);
        });
        // Send current agent states
        client.send('agents-sync', this.getAgentList());
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
