import type { AgentConfig } from '@aihq/core';

export interface AgentDefinition extends Omit<AgentConfig, 'avatar' | 'inference' | 'personality' | 'memory'> {
    deskPosition: [number, number, number];
    rolePrompt: string;
    communicationStyle: 'technical' | 'casual' | 'creative' | 'formal';
    breakFrequency: number;
}

// Core agent roster — edit this file to customise agents without touching OfficeRoom
export const CORE_AGENTS: AgentDefinition[] = [
    {
        id: 'pa',
        name: 'Alex',
        role: 'PA / Orchestrator',
        deskPosition: [-6, 0, -5],
        rolePrompt: 'You are Alex, the PA and Chief of Staff. You route CEO commands, delegate to specialists, and synthesise reports. Be direct, decisive, and concise.',
        communicationStyle: 'formal',
        breakFrequency: 120,
        capabilities: [
            { name: 'create_task',  description: 'Create a task for a team member. Params: { title: string, assignee: string }' },
            { name: 'hire_agent',   description: 'Hire a new team member. Params: { name: string, role: string }' },
        ],
    },
    {
        id: 'dev',
        name: 'Dev',
        role: 'Developer',
        deskPosition: [-4, 0, 2],
        rolePrompt: 'You are Dev, a senior full-stack developer. You write production-quality code. Output only the deliverable — no preamble, no markdown fences unless the content is markdown. When the task is a web page, output ONE self-contained HTML file: start with <!DOCTYPE html>, put all CSS in a <style> tag in the head, all JS in a <script> tag — never reference external .css or .js files.',
        communicationStyle: 'technical',
        breakFrequency: 90,
        capabilities: [
            { name: 'code_execute', description: 'Execute JavaScript or Python code in a sandbox. Params: { code: string, language: "javascript"|"python" }' },
            { name: 'write_file',   description: 'Write a file to output/. Params: { content: string, filename: string, extension: string }' },
            { name: 'read_file',    description: 'Read a file from output/. Params: { path: string }' },
            { name: 'web_search',   description: 'Search the web. Params: { query: string }' },
        ],
    },
    {
        id: 'researcher',
        name: 'Ray',
        role: 'Researcher',
        deskPosition: [0, 0, 2],
        rolePrompt: 'You are Ray, a research specialist. You produce thorough, well-structured research briefs with headers, key findings, and source URLs where relevant. Output only the deliverable.',
        communicationStyle: 'formal',
        breakFrequency: 100,
        capabilities: [
            { name: 'web_search',   description: 'Search the web. Params: { query: string }' },
            { name: 'write_file',   description: 'Write a file to output/. Params: { content: string, filename: string, extension: string }' },
        ],
    },
    {
        id: 'copywriter',
        name: 'Cleo',
        role: 'Copywriter',
        deskPosition: [4, 0, 2],
        rolePrompt: 'You are Cleo, a senior copywriter. You produce compelling, conversion-focused copy. Output only the final copy in plain markdown — headline, subheadline, section copy, CTA text. Never output HTML or code, even if teammates\' work contains it; the developer turns your copy into a page.',
        communicationStyle: 'creative',
        breakFrequency: 110,
        capabilities: [
            { name: 'write_file',   description: 'Write a file to output/. Params: { content: string, filename: string, extension: string }' },
            { name: 'web_search',   description: 'Search the web for reference and inspiration. Params: { query: string }' },
        ],
    },
    {
        id: 'analyst',
        name: 'Max',
        role: 'Market Analyst',
        deskPosition: [8, 0, 2],
        rolePrompt: 'You are Max, a market analyst. You produce actionable market analysis with sizing, competitor landscape, and specific recommendations. Output only the deliverable.',
        communicationStyle: 'formal',
        breakFrequency: 105,
        capabilities: [
            { name: 'web_search',   description: 'Search the web for market data and competitor intel. Params: { query: string }' },
            { name: 'write_file',   description: 'Write a file to output/. Params: { content: string, filename: string, extension: string }' },
        ],
    },
];

// Furniture / hire desk positions for dynamically hired agents
export const HIRE_DESK_POSITIONS: Array<[number, number, number]> = [
    [12, 0, 18], [19, 0, 18], [26, 0, 18],
    [12, 0, 24], [19, 0, 24], [26, 0, 24],
];

// Board room seat positions
export const BOARD_SEATS: Array<{ x: number; y: number }> = [
    { x: 13, y: 5 }, { x: 15, y: 4 }, { x: 17, y: 5 },
    { x: 13, y: 7 }, { x: 15, y: 8 }, { x: 17, y: 7 },
];

// Default model per provider — used when CEO hasn't specified a model
export const DEFAULT_MODELS: Record<string, string> = {
    ollama:      'llama3.2:3b',
    openai:      'gpt-4o-mini',
    anthropic:   'claude-sonnet-4-6',
    groq:        'llama3-8b-8192',
    gemini:      'gemini-1.5-flash',
    openrouter:  'meta-llama/llama-3.1-8b-instruct:free',
};
