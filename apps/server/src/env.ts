import { readFileSync } from 'fs';
import path from 'path';

// Zero-dep .env loader — the README tells users to configure the root .env,
// so the server must actually read it. Checks repo root (when run from
// apps/server via npm workspaces) and cwd. Real environment variables win.
for (const file of [
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '.env'),
]) {
    try {
        for (const line of readFileSync(file, 'utf-8').split('\n')) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
            if (m && process.env[m[1]] === undefined) {
                process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
            }
        }
    } catch { /* file absent — defaults apply */ }
}
