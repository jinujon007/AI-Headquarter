'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOfficeWs } from '@/hooks/use-office-ws';
import ReactMarkdown from 'react-markdown';
import { X, Download, Copy, Check, FileText, Loader2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  assigned_to?: string;
  assignedTo?: string;
  agentId?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  outputPath?: string;
  output_path?: string;
  output?: string;
};

function agentLabel(t: Task) {
  return t.assigned_to || t.assignedTo || t.agentId || 'unassigned';
}

function outputPath(t: Task) {
  return t.outputPath || t.output_path || t.output || null;
}

function statusColor(status: string | undefined) {
  switch (status) {
    case 'completed': case 'done': return '#4ade80';
    case 'in-progress': case 'in_progress': return '#60a5fa';
    default: return '#9ca3af';
  }
}

// ─── Output Drawer ───────────────────────────────────────────────────────────

function OutputDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const path = outputPath(task);

  useEffect(() => {
    if (!path) {
      setError('No output file linked to this task.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/output?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setContent(data.content);
        } else {
          setError(data.error || 'Could not load output.');
        }
      })
      .catch(() => setError('Server unreachable.'))
      .finally(() => setLoading(false));
  }, [path]);

  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content || !path) return;
    const filename = path.split('/').pop() || 'output.md';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, path]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(680px, 92vw)',
          background: 'var(--bg-secondary, #0f1117)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Agent Output
              </span>
            </div>
            <h2
              className="font-bold text-base leading-snug"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
            >
              {task.title}
            </h2>
            <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>{agentLabel(task)}</span>
              {path && (
                <>
                  <span>·</span>
                  <span className="font-mono truncate max-w-[200px]" title={path}>
                    {path.split('/').pop()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {content && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: 'var(--card-elevated)',
                    color: copied ? '#4ade80' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: 'var(--card-elevated)', color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center h-32 gap-3" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading output…</span>
            </div>
          )}
          {error && (
            <div
              className="rounded-lg p-4 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </div>
          )}
          {content && !loading && (
            <article
              className="prose prose-invert prose-sm max-w-none"
              style={{ color: 'var(--text-primary)' }}
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tasks Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const ws = useOfficeWs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]));
  }, []);

  useEffect(() => {
    if (!ws.tasks.length) return;
    setTasks(prev => {
      const next = [...prev];
      for (const evt of ws.tasks) {
        const idx = next.findIndex(t => t.id === evt.id);
        if (idx === -1 && evt.status === 'created') {
          next.unshift({
            id: evt.id,
            title: evt.title,
            assignedTo: evt.agentId,
            status: 'in-progress',
          });
        }
        if (idx >= 0 && evt.status === 'completed') {
          next[idx] = { ...next[idx], status: 'done', outputPath: evt.outputPath };
          // refresh selected if it was this task
          setSelected(s => s?.id === evt.id ? { ...s, outputPath: evt.outputPath } : s);
        }
      }
      return next;
    });
  }, [ws.tasks]);

  const ordered = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const ta = new Date(a.createdAt || a.created_at || 0).getTime();
      const tb = new Date(b.createdAt || b.created_at || 0).getTime();
      return tb - ta;
    });
  }, [tasks]);

  const hasOutput = (t: Task) => !!(outputPath(t));

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          Tasks
        </h1>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: ws.connected ? '#4ade80' : '#6b7280' }}
          />
          {ws.connected ? 'Live' : 'Reconnecting'}
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <div
          className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider grid"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
            gridTemplateColumns: '1fr 120px 120px 100px',
          }}
        >
          <span>Task</span>
          <span>Agent</span>
          <span>Status</span>
          <span className="text-right">Output</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {ordered.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No tasks yet. Give Alex a command to get started.
            </div>
          ) : (
            ordered.map(t => (
              <div
                key={t.id}
                className="px-4 py-3 grid items-center hover:bg-opacity-50 transition-colors"
                style={{
                  gridTemplateColumns: '1fr 120px 120px 100px',
                  background: selected?.id === t.id ? 'var(--card-elevated)' : undefined,
                }}
              >
                <div className="min-w-0 pr-4">
                  <div
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--text-primary)' }}
                    title={t.title}
                  >
                    {t.title || t.id}
                  </div>
                  <div className="text-xs mt-0.5 font-mono opacity-50" style={{ color: 'var(--text-muted)' }}>
                    {t.id}
                  </div>
                </div>

                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {agentLabel(t)}
                </div>

                <div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      background: `${statusColor(t.status)}20`,
                      color: statusColor(t.status),
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: statusColor(t.status) }}
                    />
                    {t.status || 'pending'}
                  </span>
                </div>

                <div className="text-right">
                  {hasOutput(t) ? (
                    <button
                      onClick={() => setSelected(t)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90"
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <OutputDrawer task={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
