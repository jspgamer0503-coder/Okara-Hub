import React, { useState, useEffect, useRef } from 'react';
import { Bug, RefreshCw, Copy, Trash2, ShieldCheck, ShieldOff, TrendingUp } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { isElectron, cn } from '../lib/utils';

const LEVEL_COLORS = {
  INFO:    'text-blue-400',
  ERROR:   'text-red-400',
  ADBLOCK: 'text-yellow-400',
  ROUTER:  'text-green-400',
  WARN:    'text-orange-400',
  LOGOS:   'text-purple-400',
};

export default function LogsPage() {
  const { logs, refreshLogs, setLogs, prefs, savePrefs } = useApp();
  const [filter, setFilter]   = useState('ALL');
  const [copied, setCopied]   = useState(false);
  const [stats, setStats]     = useState({ total: 0, byDomain: {} });
  const [tab, setTab]         = useState('logs'); // 'logs' | 'adblock'
  const bottomRef = useRef(null);

  useEffect(() => { refreshLogs(); }, []);

  // Poll ad block stats every 2s when on adblock tab
  useEffect(() => {
    if (!isElectron || tab !== 'adblock') return;
    const load = async () => setStats(await window.electronAPI.getAdBlockStats() || { total: 0, byDomain: {} });
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [tab]);

  useEffect(() => {
    if (tab === 'logs') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, tab]);

  const clearLogs = async () => {
    if (isElectron) await window.electronAPI.clearLogs();
    setLogs([]);
  };

  const copyLogs = async () => {
    if (isElectron) await window.electronAPI.copyLogs();
    else navigator.clipboard.writeText(logs.map(l => `[${l.ts}][${l.level}][${l.tag}] ${l.msg}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const resetStats = async () => {
    if (isElectron) await window.electronAPI.resetAdBlockStats();
    setStats({ total: 0, byDomain: {} });
  };

  const LEVELS = ['ALL', 'INFO', 'ERROR', 'ADBLOCK', 'ROUTER', 'LOGOS'];
  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.level === filter);

  // Top blocked domains sorted by count
  const topDomains = Object.entries(stats.byDomain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-nd-accent flex items-center justify-center">
            <Bug size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Bug Tracker</h1>
            <p className="text-nd-muted text-xs">
              {stats.total > 0 ? `${stats.total.toLocaleString()} requests blocked` : 'Logs & ad block monitor'}
            </p>
          </div>
        </div>

        {/* Ad block toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {prefs.adBlockEnabled
              ? <ShieldCheck size={14} className="text-green-400" />
              : <ShieldOff size={14} className="text-nd-muted" />}
            <span className="text-xs text-nd-muted">Ad Block</span>
            <button
              onClick={() => savePrefs({ adBlockEnabled: !prefs.adBlockEnabled })}
              className={cn('w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
                prefs.adBlockEnabled ? 'bg-green-600' : 'bg-nd-bar border border-nd-border')}
            >
              <div className={cn('w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
                prefs.adBlockEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1">
        <button
          onClick={() => setTab('logs')}
          className={cn('px-3 py-1.5 text-xs rounded-lg transition-colors',
            tab === 'logs' ? 'bg-nd-accent text-white' : 'bg-nd-bar text-nd-muted hover:text-white border border-nd-border')}
        >
          Log Viewer
        </button>
        <button
          onClick={() => setTab('adblock')}
          className={cn('px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5',
            tab === 'adblock' ? 'bg-nd-accent text-white' : 'bg-nd-bar text-nd-muted hover:text-white border border-nd-border')}
        >
          <ShieldCheck size={11} />
          Ad Block
          {stats.total > 0 && (
            <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-bold',
              tab === 'adblock' ? 'bg-white text-nd-accent' : 'bg-yellow-500 text-black')}>
              {stats.total > 999 ? `${(stats.total/1000).toFixed(1)}k` : stats.total}
            </span>
          )}
        </button>
      </div>

      {/* ── LOG VIEWER ── */}
      {tab === 'logs' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={cn('px-2.5 py-1 text-xs rounded-lg transition-colors',
                    filter === level
                      ? 'bg-nd-accent text-white'
                      : 'bg-nd-bar text-nd-muted hover:text-white border border-nd-border')}
                >
                  {level}
                  <span className="ml-1 opacity-60">
                    {level === 'ALL' ? logs.length : logs.filter(l => l.level === level).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={refreshLogs} className="p-1.5 text-nd-muted hover:text-white transition-colors" title="Refresh">
                <RefreshCw size={13} />
              </button>
              <button onClick={copyLogs} className="flex items-center gap-1 px-2 py-1 text-xs text-nd-muted hover:text-white border border-nd-border rounded transition-colors">
                <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={clearLogs} className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-red-900 rounded transition-colors">
                <Trash2 size={11} /> Clear
              </button>
            </div>
          </div>

          <div className="flex-1 bg-nd-bar border border-nd-border rounded-xl overflow-auto font-mono text-xs p-3">
            {filtered.length === 0 ? (
              <p className="text-nd-muted text-center py-8">No log entries</p>
            ) : (
              <>
                {filtered.map((entry, i) => (
                  <div key={i} className="flex gap-2 py-0.5 px-1 rounded hover:bg-nd-panel transition-colors">
                    <span className="text-nd-muted flex-shrink-0 w-[90px]">
                      {entry.ts ? new Date(entry.ts).toLocaleTimeString() : '--'}
                    </span>
                    <span className={cn('flex-shrink-0 w-14 font-semibold', LEVEL_COLORS[entry.level] || 'text-nd-text')}>
                      {entry.level}
                    </span>
                    <span className="text-nd-muted flex-shrink-0 w-16 truncate">[{entry.tag}]</span>
                    <span className="text-nd-text break-all">{entry.msg}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </>
      )}

      {/* ── AD BLOCK STATS ── */}
      {tab === 'adblock' && (
        <div className="flex-1 overflow-auto flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-nd-muted text-xs">Total Blocked</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-nd-muted text-xs">Unique Domains</p>
              <p className="text-2xl font-bold text-white">{Object.keys(stats.byDomain).length}</p>
            </div>
            <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-nd-muted text-xs">Status</p>
              <p className={cn('text-sm font-bold', prefs.adBlockEnabled ? 'text-green-400' : 'text-red-400')}>
                {prefs.adBlockEnabled ? '🛡️ Active' : '⚠️ Disabled'}
              </p>
            </div>
          </div>

          {/* Top blocked domains */}
          <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-yellow-400" />
                <p className="text-nd-text text-sm font-medium">Top Blocked Domains</p>
              </div>
              <button onClick={resetStats} className="text-xs text-nd-muted hover:text-red-400 transition-colors flex items-center gap-1">
                <Trash2 size={11} /> Reset
              </button>
            </div>

            {topDomains.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
                <ShieldCheck size={32} className={prefs.adBlockEnabled ? 'text-green-400' : 'text-nd-muted'} />
                <p className="text-nd-muted text-sm text-center">
                  {prefs.adBlockEnabled
                    ? 'No ads blocked yet — open an AI provider to start browsing'
                    : 'Ad blocking is disabled. Enable it above to start blocking.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-auto">
                {topDomains.map(([domain, count]) => {
                  const pct = Math.round((count / stats.total) * 100);
                  return (
                    <div key={domain} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                      <span className="text-nd-text text-xs font-mono flex-1 truncate">{domain}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-nd-bar rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-nd-muted text-xs w-12 text-right">{count.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
