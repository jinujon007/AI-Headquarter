'use client';

import { useEffect, useState } from 'react';
import { Settings, Key, CheckCircle } from 'lucide-react';
import { QuickActions } from '@/components/QuickActions';

const BYOK_FIELDS = [
  { label: 'Anthropic (Claude)', key: 'apiKey_anthropic', type: 'password' as const },
  { label: 'OpenAI', key: 'apiKey_openai', type: 'password' as const },
  { label: 'OpenRouter', key: 'apiKey_openrouter', type: 'password' as const },
  { label: 'Groq', key: 'apiKey_groq', type: 'password' as const },
  { label: 'Gemini', key: 'apiKey_gemini', type: 'password' as const },
  { label: 'Ollama URL', key: 'ollamaUrl', type: 'text' as const, placeholder: 'http://localhost:11434' },
];

function BYOKSection() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded: Record<string, string> = {};
    BYOK_FIELDS.forEach(f => {
      loaded[f.key] = localStorage.getItem(f.key) || (f.type === 'text' ? (f.placeholder || '') : '');
    });
    setValues(loaded);
  }, []);

  const save = (key: string) => {
    localStorage.setItem(key, values[key] || '');
    setSaved(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
  };

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--card)' }}>
      <h2
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
      >
        <Key className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        API Keys (BYOK)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BYOK_FIELDS.map(f => (
          <div key={f.key}>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {f.label}
            </label>
            <div className="flex gap-2">
              <input
                type={f.type}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: 'rgba(26, 26, 26, 0.8)',
                  border: '1px solid rgba(42, 42, 42, 0.8)',
                  color: 'var(--text-primary)',
                }}
                placeholder={f.placeholder}
                value={values[f.key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: saved[f.key] ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                  color: saved[f.key] ? 'rgb(52, 211, 153)' : 'var(--accent)',
                  border: `1px solid ${saved[f.key] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 59, 48, 0.3)'}`,
                }}
                onClick={() => save(f.key)}
              >
                {saved[f.key] && <CheckCircle className="w-3 h-3" />}
                {saved[f.key] ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetSection() {
  const [budget, setBudget] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d?.budgetUsd != null) setBudget(String(d.budgetUsd)); })
      .catch(() => {});
  }, []);

  const save = async () => {
    const value = budget.trim() === '' ? null : Number(budget);
    if (value !== null && (!Number.isFinite(value) || value < 0)) { setStatus('error'); return; }
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetUsd: value }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--card)' }}>
      <h2
        className="text-xl font-semibold mb-2 flex items-center gap-2"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
      >
        <Key className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        Monthly Budget Cap (BYOK)
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        When month-to-date spend reaches this cap, paid-model calls are refused until you raise it.
        Leave empty for no cap. Local Ollama is always free and never blocked.
      </p>
      <div className="flex gap-2 max-w-xs">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="No cap"
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            backgroundColor: 'rgba(26, 26, 26, 0.8)',
            border: '1px solid rgba(42, 42, 42, 0.8)',
            color: 'var(--text-primary)',
          }}
          value={budget}
          onChange={e => setBudget(e.target.value)}
        />
        <button
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: status === 'saved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 59, 48, 0.15)',
            color: status === 'saved' ? 'rgb(52, 211, 153)' : 'var(--accent)',
            border: `1px solid ${status === 'saved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 59, 48, 0.3)'}`,
          }}
          onClick={save}
        >
          {status === 'saved' && <CheckCircle className="w-3 h-3" />}
          {status === 'saved' ? 'Saved' : status === 'error' ? 'Failed' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6" style={{ color: 'var(--accent)' }} />
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Settings
        </h1>
      </div>
      <BYOKSection />
      <BudgetSection />
      <QuickActions />
    </div>
  );
}
