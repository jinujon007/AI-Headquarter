import { NextResponse } from "next/server";
import os from "os";
import { cpuUsagePercent, getDiskStats } from "@/lib/system";

export const dynamic = "force-dynamic";

// Status-bar metrics: CPU, RAM, disk, uptime. Nothing invented — every value
// comes from the OS of the machine running the dashboard.
export async function GET() {
  try {
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();

    const disk = await getDiskStats();

    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);

    return NextResponse.json({
      cpu: cpuUsagePercent(),
      ram: {
        used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
        total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
      },
      disk: { used: disk.used, total: disk.total },
      uptime: `${days}d ${hours}h`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch system stats" }, { status: 500 });
  }
}
