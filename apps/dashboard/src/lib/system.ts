import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const isWindows = os.platform() === "win32";

// Real CPU usage from os.cpus() time deltas — works on Windows too,
// unlike os.loadavg() which is always [0,0,0] there.
let prevCpus = os.cpus();
export function cpuUsagePercent(): number {
  const cur = os.cpus();
  let idle = 0;
  let total = 0;
  for (let i = 0; i < cur.length; i++) {
    const c = cur[i].times;
    const p = prevCpus[i]?.times ?? { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
    idle += c.idle - p.idle;
    total += (c.user - p.user) + (c.nice - p.nice) + (c.sys - p.sys) + (c.idle - p.idle) + (c.irq - p.irq);
  }
  prevCpus = cur;
  return total > 0 ? Math.min(Math.round((1 - idle / total) * 100), 100) : 0;
}

export async function getDiskStats(): Promise<{ total: number; used: number; free: number; percent: number }> {
  const defaults = { total: 0, used: 0, free: 0, percent: 0 };
  try {
    if (isWindows) {
      const { stdout } = await execAsync(
        'powershell -NoProfile -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"',
        { timeout: 5000 }
      );
      const d = JSON.parse(stdout.trim()) as { Used: number; Free: number };
      const used = Math.round(d.Used / 1024 / 1024 / 1024);
      const free = Math.round(d.Free / 1024 / 1024 / 1024);
      const total = used + free;
      return { total, used, free, percent: total > 0 ? (used / total) * 100 : 0 };
    }
    const { stdout } = await execAsync("df -BG / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    const total = parseInt(parts[1]) || 0;
    const used = parseInt(parts[2]) || 0;
    const free = parseInt(parts[3]) || 0;
    return { total, used, free, percent: total > 0 ? (used / total) * 100 : 0 };
  } catch {
    return defaults;
  }
}
