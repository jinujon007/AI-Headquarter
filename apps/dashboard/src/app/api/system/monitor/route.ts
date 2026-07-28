import { NextResponse } from "next/server";
import os from "os";
import { cpuUsagePercent, getDiskStats } from "@/lib/system";

const isWindows = os.platform() === "win32";

interface ServiceEntry {
  name: string;
  status: string;
  description: string;
  backend: string;
  uptime?: number | null;
  restarts?: number;
  pid?: number | null;
  mem?: number | null;
  cpu?: number | null;
}

async function getNetworkStats(): Promise<{ rx: number; tx: number }> {
  try {
    if (isWindows) {
      // Use netstat byte counts on Windows — approximate, not per-second
      return { rx: 0, tx: 0 };
    }
    const { readFileSync } = await import("fs");
    function readNetStats() {
      const netDev = readFileSync("/proc/net/dev", "utf-8");
      const lines = netDev.trim().split("\n").slice(2);
      let rx = 0, tx = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0].replace(":", "") === "lo") continue;
        rx += parseInt(parts[1]) || 0;
        tx += parseInt(parts[9]) || 0;
      }
      return { rx, tx, ts: Date.now() };
    }
    const current = readNetStats();
    const g = global as Record<string, unknown>;
    if (g.__netPrev) {
      const prev = g.__netPrev as { rx: number; tx: number; ts: number };
      const dtSec = (current.ts - prev.ts) / 1000;
      if (dtSec > 0) {
        g.__netPrev = current;
        return {
          rx: parseFloat(Math.max(0, (current.rx - prev.rx) / 1024 / 1024 / dtSec).toFixed(3)),
          tx: parseFloat(Math.max(0, (current.tx - prev.tx) / 1024 / 1024 / dtSec).toFixed(3)),
        };
      }
    }
    g.__netPrev = current;
  } catch { /* ignore */ }
  return { rx: 0, tx: 0 };
}

async function getServices(): Promise<ServiceEntry[]> {
  const services: ServiceEntry[] = [];

  // Check AIHQ server by hitting its health endpoint
  try {
    const serverUrl = process.env.SERVER_URL || "http://localhost:3001";
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(2000) });
    services.push({
      name: "aihq-server",
      status: res.ok ? "active" : "failed",
      description: "AI HQ Agent Server",
      backend: "node",
      pid: null,
    });
  } catch {
    services.push({
      name: "aihq-server",
      status: "inactive",
      description: "AI HQ Agent Server",
      backend: "node",
    });
  }

  // Check Ollama
  try {
    const res = await fetch("http://localhost:11434", { signal: AbortSignal.timeout(2000) });
    services.push({
      name: "ollama",
      status: res.ok ? "active" : "failed",
      description: "Ollama — Local LLM Runtime",
      backend: "node",
    });
  } catch {
    services.push({
      name: "ollama",
      status: "inactive",
      description: "Ollama — Local LLM Runtime",
      backend: "node",
    });
  }

  return services;
}

export async function GET() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const [disk, network, services] = await Promise.all([
      getDiskStats(),
      getNetworkStats(),
      getServices(),
    ]);

    return NextResponse.json({
      cpu: {
        usage: cpuUsagePercent(),
        coreCount: os.cpus().length,
        loadAvg: os.loadavg().map((v) => v ?? 0),
      },
      ram: {
        total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
        used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
        free: parseFloat((freeMem / 1024 / 1024 / 1024).toFixed(2)),
        cached: 0,
      },
      disk,
      network,
      systemd: services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system monitor data:", error);
    return NextResponse.json({ error: "Failed to fetch system monitor data" }, { status: 500 });
  }
}
