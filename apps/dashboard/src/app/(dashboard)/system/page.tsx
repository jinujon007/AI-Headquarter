"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Network, Server, ArrowDown, ArrowUp } from "lucide-react";

interface SystemdService {
  name: string;
  status: string;
  description: string;
  backend?: string;
}

interface SystemData {
  cpu: { usage: number; coreCount: number; loadAvg: number[] };
  ram: { total: number; used: number; free: number; cached: number };
  disk: { total: number; used: number; free: number; percent: number };
  network: { rx: number; tx: number };
  systemd: SystemdService[];
}

export default function SystemMonitorPage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<"hardware" | "services">("hardware");

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const res = await fetch("/api/system/monitor");
        if (res.ok) {
          const data = await res.json();
          setSystemData(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch system data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading system data...</p>
        </div>
      </div>
    );
  }

  if (!systemData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Server className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Failed to load system data</p>
        </div>
      </div>
    );
  }

  const cpuColor = systemData.cpu.usage < 60 ? "var(--success)" : systemData.cpu.usage < 85 ? "var(--warning)" : "var(--error)";
  const ramPercent = (systemData.ram.used / systemData.ram.total) * 100;
  const ramColor = ramPercent < 60 ? "var(--success)" : ramPercent < 85 ? "var(--warning)" : "var(--error)";
  const diskColor = systemData.disk.percent < 60 ? "var(--success)" : systemData.disk.percent < 85 ? "var(--warning)" : "var(--error)";
  // os.loadavg() is all zeros on Windows — hide the row rather than display fake 0.00s
  const hasLoadAvg = systemData.cpu.loadAvg.some((v) => v > 0);
  const activeServices = systemData.systemd.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            System Monitor
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Real-time monitoring of server resources and services</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--success)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--success)" }} />
            Live
          </span>
          {lastUpdated && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {[{ id: "hardware", label: "Hardware", icon: Cpu }, { id: "services", label: "Services", icon: Server }].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as "hardware" | "services")}
              className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
              style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent" }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Hardware Tab */}
      {selectedTab === "hardware" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CPU */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <Cpu className="w-5 h-5" style={{ color: cpuColor }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>CPU</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{systemData.cpu.coreCount} cores</p>
                </div>
              </div>
              <span className="text-2xl font-bold" style={{ color: cpuColor }}>{systemData.cpu.usage}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${systemData.cpu.usage}%`, backgroundColor: cpuColor }} />
            </div>
            {hasLoadAvg && (
              <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>Load Average</span>
                <span>{(systemData.cpu.loadAvg[0] ?? 0).toFixed(2)} / {(systemData.cpu.loadAvg[1] ?? 0).toFixed(2)} / {(systemData.cpu.loadAvg[2] ?? 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* RAM */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <MemoryStick className="w-5 h-5" style={{ color: ramColor }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>RAM</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{(systemData.ram.used ?? 0).toFixed(1)}GB / {(systemData.ram.total ?? 0).toFixed(1)}GB</p>
                </div>
              </div>
              <span className="text-2xl font-bold" style={{ color: ramColor }}>{ramPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${ramPercent}%`, backgroundColor: ramColor }} />
            </div>
          </div>

          {/* Disk */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <HardDrive className="w-5 h-5" style={{ color: diskColor }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Disk</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{(systemData.disk.used ?? 0).toFixed(1)}GB / {(systemData.disk.total ?? 0).toFixed(1)}GB</p>
                </div>
              </div>
              <span className="text-2xl font-bold" style={{ color: diskColor }}>{(systemData.disk.percent ?? 0).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${systemData.disk.percent}%`, backgroundColor: diskColor }} />
            </div>
          </div>

          {/* Network */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <Network className="w-5 h-5" style={{ color: "var(--info, #3b82f6)" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Network</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Live I/O (Linux only)</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <ArrowDown className="w-4 h-4" style={{ color: "var(--success)" }} />
                  <span>RX (in)</span>
                </div>
                <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{systemData.network.rx.toFixed(2)} MB/s</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <ArrowUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span>TX (out)</span>
                </div>
                <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{systemData.network.tx.toFixed(2)} MB/s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab — read-only health of the two processes AI HQ actually depends on */}
      {selectedTab === "services" && (
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Server className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Services ({activeServices}/{systemData.systemd.length} active)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Service</th>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Description</th>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {systemData.systemd.map((svc) => (
                  <tr key={svc.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-3 px-3">
                      <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>{svc.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{svc.description || "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              svc.status === "active" ? "var(--success)" :
                              svc.status === "failed" ? "var(--error)" : "var(--text-muted)",
                          }}
                        />
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor:
                              svc.status === "active" ? "var(--success-bg)" :
                              svc.status === "failed" ? "var(--error-bg)" : "var(--card-elevated)",
                            color:
                              svc.status === "active" ? "var(--success)" :
                              svc.status === "failed" ? "var(--error)" : "var(--text-muted)",
                          }}
                        >
                          {svc.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
