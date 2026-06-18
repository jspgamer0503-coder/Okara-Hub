import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { isElectron, cn } from '../lib/utils';

/**
 * UpdateBanner — sits at the bottom of the app.
 * Listens for updater events from the main process and shows:
 *   - "Update available" with changelog + download button
 *   - Download progress bar
 *   - "Installing..." then auto-restart
 */
export default function UpdateBanner() {
  const [state, setState] = useState(null);
  // state shapes:
  //   { type: 'available', newVersion, notes, date, size, url }
  //   { type: 'downloading', percent }
  //   { type: 'installing' }
  //   { type: 'installed' }
  //   { type: 'error', message }
  //   { type: 'up-to-date' }

  const [dismissed, setDismissed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    window.electronAPI.onUpdateAvailable(d => {
      setState({ type: 'available', ...d });
      setDismissed(false);
    });
    window.electronAPI.onUpdateProgress(d => {
      setState(s => ({ ...s, type: 'downloading', percent: d.percent }));
    });
    window.electronAPI.onUpdateComplete(() => {
      setState(s => ({ ...s, type: 'installing' }));
    });
    window.electronAPI.onUpdateInstalling(() => {
      setState(s => ({ ...s, type: 'installing' }));
    });
    window.electronAPI.onUpdateInstalled(() => {
      setState(s => ({ ...s, type: 'installed' }));
    });
    window.electronAPI.onUpdateError(d => {
      setState(s => ({ ...s, type: 'error', message: d.message }));
    });
    window.electronAPI.onUpToDate(() => {
      setState({ type: 'up-to-date' });
      setTimeout(() => setState(null), 3000);
    });
  }, []);

  const startDownload = () => {
    if (!state?.url) return;
    setState(s => ({ ...s, type: 'downloading', percent: 0 }));
    window.electronAPI.installUpdate({ url: state.url, version: state.newVersion });
  };

  if (!state || dismissed) return null;

  // Up-to-date flash
  if (state.type === 'up-to-date') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/40 border-t border-green-800 text-green-400 text-xs">
        <CheckCircle size={13} />
        Neural Dock is up to date
      </div>
    );
  }

  return (
    <div className="border-t border-nd-border bg-nd-panel">
      {/* ── Available ── */}
      {state.type === 'available' && (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-6 h-6 rounded-full bg-nd-accent flex items-center justify-center flex-shrink-0">
            <Download size={12} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold">
                Update available — v{state.newVersion}
              </span>
              {state.date && (
                <span className="text-nd-muted text-xs">{state.date}</span>
              )}
              {state.notes && (
                <button
                  onClick={() => setShowNotes(v => !v)}
                  className="text-nd-accent text-xs hover:underline"
                >
                  {showNotes ? 'Hide changelog' : 'What\'s new'}
                </button>
              )}
            </div>
            {showNotes && state.notes && (
              <pre className="text-nd-muted text-xs mt-1 whitespace-pre-wrap font-sans leading-relaxed max-h-20 overflow-auto">
                {state.notes}
              </pre>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {state.size > 0 && (
              <span className="text-nd-muted text-xs">
                {(state.size / 1024 / 1024).toFixed(0)} MB
              </span>
            )}
            <button
              onClick={startDownload}
              className="px-3 py-1.5 bg-nd-accent hover:bg-nd-accent-light text-white text-xs rounded-lg transition-colors font-medium"
            >
              Download & Install
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-nd-muted hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Downloading ── */}
      {state.type === 'downloading' && (
        <div className="px-4 py-2.5 flex items-center gap-3">
          <Loader size={14} className="text-nd-accent animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white">Downloading update…</span>
              <span className="text-nd-muted">{state.percent ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-nd-bar rounded-full overflow-hidden">
              <div
                className="h-full bg-nd-accent rounded-full transition-all duration-300"
                style={{ width: `${state.percent ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Installing ── */}
      {state.type === 'installing' && (
        <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-white">
          <Loader size={14} className="text-nd-accent animate-spin" />
          Installing update — app will restart automatically…
        </div>
      )}

      {/* ── Installed ── */}
      {state.type === 'installed' && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-green-400">
          <CheckCircle size={14} />
          Update installed! Restarting…
        </div>
      )}

      {/* ── Error ── */}
      {state.type === 'error' && (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-xs flex-1">Update failed: {state.message}</span>
          <button
            onClick={startDownload}
            className="flex items-center gap-1 text-xs text-nd-muted hover:text-white transition-colors"
          >
            <RefreshCw size={11} /> Retry
          </button>
          <button onClick={() => setDismissed(true)} className="text-nd-muted hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
