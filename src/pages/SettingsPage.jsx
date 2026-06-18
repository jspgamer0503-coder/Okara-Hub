import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff, Shield, ShieldOff, Download, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import ModelAvatar from '../components/ModelAvatar';
import { cn, isElectron } from '../lib/utils';

const COLORS = ['#10a37f','#d97757','#4285f4','#20b2aa','#1e40af','#ff7000','#1da1f2','#0866ff','#8b5cf6','#e11d48','#f59e0b','#06b6d4'];

function ModelCard({ model, onToggle, onDelete, onEdit }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      model.enabled ? 'bg-nd-panel border-nd-border' : 'bg-nd-bar border-nd-border opacity-60'
    )}>
      <ModelAvatar model={model} size={36} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{model.name}</div>
        <div className="text-xs text-nd-muted truncate">{model.url}</div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {model.tags?.map(t => (
            <span key={t} className="text-xs text-nd-muted bg-nd-bar px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {model.isDefault !== false && (
          <span className="text-xs text-nd-muted px-1.5 py-0.5 rounded bg-nd-bar">built-in</span>
        )}
        <button
          onClick={() => onToggle(model)}
          title={model.enabled ? 'Disable' : 'Enable'}
          className="p-1.5 rounded hover:bg-nd-row text-nd-muted hover:text-white transition-colors"
        >
          {model.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        {!model.isDefault && (
          <button
            onClick={() => onDelete(model.id)}
            className="p-1.5 rounded hover:bg-red-900 text-nd-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { models, saveModels, prefs, savePrefs } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', url: '', color: '#7c3aed', tags: '' });

  const toggleModel = async (model) => {
    const updated = models.map(m => m.id === model.id ? { ...m, enabled: !m.enabled } : m);
    await saveModels(updated);
  };

  const deleteModel = async (id) => {
    await saveModels(models.filter(m => m.id !== id));
  };

  const addModel = async () => {
    if (!newModel.name || !newModel.url) return;
    const id = newModel.url.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 20) + '-' + Date.now().toString(36);
    const model = {
      id,
      name: newModel.name,
      url: newModel.url,
      color: newModel.color,
      tags: newModel.tags ? newModel.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      enabled: true,
      isDefault: false,
      sortOrder: models.length,
    };
    const newModels = [...models, model];
    await saveModels(newModels);
    // Fetch official logo from the provider's domain in the background
    if (isElectron) {
      window.electronAPI.fetchLogoForModel(model).catch(() => {});
    }
    setNewModel({ name: '', url: '', color: '#7c3aed', tags: '' });
    setShowAdd(false);
  };

  // ── Update checker state ──
  const [updateStatus, setUpdateStatus] = useState(null);
  // null | 'checking' | 'up-to-date' | { newVersion, notes, date, size, url } | 'downloading' | 'error'
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');

  const checkNow = useCallback(async () => {
    if (!isElectron) return;
    setUpdateStatus('checking');
    await window.electronAPI.checkForUpdate();
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.onUpdateAvailable(d  => setUpdateStatus(d));
    window.electronAPI.onUpToDate(()        => setUpdateStatus('up-to-date'));
    window.electronAPI.onUpdateProgress(d   => { setUpdateStatus('downloading'); setUpdateProgress(d.percent); });
    window.electronAPI.onUpdateInstalling(()=> setUpdateStatus('installing'));
    window.electronAPI.onUpdateInstalled(() => setUpdateStatus('installed'));
    window.electronAPI.onUpdateError(d      => { setUpdateStatus('error'); setUpdateError(d.message); });
  }, []);

  const defaults = models.filter(m => m.isDefault !== false);
  const custom = models.filter(m => m.isDefault === false);

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-nd-accent flex items-center justify-center">
          <Settings size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <p className="text-nd-muted text-xs">Manage models and preferences</p>
        </div>
      </div>

      {/* Updates */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-2">
        <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">About</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Neural Dock</p>
            <p className="text-xs text-nd-muted">
              To update, download the new archive from Claude and run:<br/>
              <code className="text-nd-accent font-mono">./update.sh ~/Downloads/neural-dock.tar.gz</code>
            </p>
          </div>
          <span className="text-xs text-nd-muted bg-nd-bar border border-nd-border px-2 py-1 rounded-lg font-mono">
            v1.0.0
          </span>
        </div>
      </div>

            {/* Ad Block Toggle */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">Preferences</p>
          {isElectron && (
            <button
              onClick={() => window.electronAPI.refreshAllLogos()}
              className="text-xs text-nd-muted hover:text-nd-accent transition-colors flex items-center gap-1"
              title="Re-fetch all logos from official sources"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh Logos
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {prefs.adBlockEnabled ? <Shield size={16} className="text-nd-accent" /> : <ShieldOff size={16} className="text-nd-muted" />}
            <div>
              <p className="text-sm font-medium text-white">Ad & Analytics Blocking</p>
              <p className="text-xs text-nd-muted">Block ads, trackers, and analytics in provider views</p>
            </div>
          </div>
          <button
            onClick={() => savePrefs({ adBlockEnabled: !prefs.adBlockEnabled })}
            className={cn(
              'w-10 h-5 rounded-full transition-colors relative',
              prefs.adBlockEnabled ? 'bg-nd-accent' : 'bg-nd-bar border border-nd-border'
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
              prefs.adBlockEnabled ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </div>
      </div>

      {/* Models */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">
            Built-in Models ({defaults.length})
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {defaults.map(m => (
            <ModelCard key={m.id} model={m} onToggle={toggleModel} onDelete={deleteModel} />
          ))}
        </div>
      </div>

      {/* Custom models */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">
            Custom Models ({custom.length})
          </p>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-nd-accent hover:bg-nd-accent-light text-white text-xs rounded-lg transition-colors"
          >
            <Plus size={13} /> Add Custom AI
          </button>
        </div>

        {showAdd && (
          <div className="p-4 bg-nd-bar border border-nd-border rounded-xl flex flex-col gap-3">
            <p className="text-white text-sm font-medium">Add Custom AI Provider</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-nd-muted text-xs">Name</label>
                <input
                  value={newModel.name}
                  onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. My AI"
                  className="w-full mt-1 px-2 py-1.5 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
                />
              </div>
              <div>
                <label className="text-nd-muted text-xs">URL</label>
                <input
                  value={newModel.url}
                  onChange={e => setNewModel(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full mt-1 px-2 py-1.5 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
                />
              </div>
              <div>
                <label className="text-nd-muted text-xs">Tags (comma-separated)</label>
                <input
                  value={newModel.tags}
                  onChange={e => setNewModel(p => ({ ...p, tags: e.target.value }))}
                  placeholder="code, writing"
                  className="w-full mt-1 px-2 py-1.5 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
                />
              </div>
              <div>
                <label className="text-nd-muted text-xs">Color</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewModel(p => ({ ...p, color: c }))}
                      className={cn('w-5 h-5 rounded-full transition-transform', newModel.color === c && 'scale-125 ring-2 ring-white')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addModel}
                disabled={!newModel.name || !newModel.url}
                className="px-4 py-1.5 bg-nd-accent hover:bg-nd-accent-light text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-1.5 bg-nd-bar border border-nd-border text-nd-text text-sm rounded-lg hover:bg-nd-row transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {custom.length > 0 ? (
          <div className="flex flex-col gap-2">
            {custom.map(m => (
              <ModelCard key={m.id} model={m} onToggle={toggleModel} onDelete={deleteModel} />
            ))}
          </div>
        ) : (
          <p className="text-nd-muted text-sm text-center py-3">No custom models yet</p>
        )}
      </div>
    </div>
  );
}
