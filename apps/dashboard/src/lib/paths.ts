export const SERVER_URL =
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://localhost:3001';

export const WS_URL = SERVER_URL
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

export const API = {
  agents:     `${SERVER_URL}/api/agents`,
  agentsHire: `${SERVER_URL}/api/agents/hire`,
  ceoMessage: `${SERVER_URL}/api/ceo/message`,
  tasks:      `${SERVER_URL}/api/tasks`,
  costs:      `${SERVER_URL}/api/costs`,
  system:     `${SERVER_URL}/api/system`,
  output:     (filePath: string) => `${SERVER_URL}/api/output?path=${encodeURIComponent(filePath)}`,
};
