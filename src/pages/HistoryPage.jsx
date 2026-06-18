import React from 'react';
import { History, Trash2 } from 'lucide-react';
import { useApp } from '../lib/AppContext';

export default function HistoryPage({ onNavigate }) {
  const { history, clearHistory, openTab, models } = useApp();

  const openFromHistory = async (entry) => {
    const model = models.find(m => m.id === entry.selected_provider_id);
    if (model) { await openTab(model); onNavigate('hub'); }
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-nd-accent flex items-center justify-center">
            <History size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Prompt History</h1>
            <p className="text-nd-muted text-xs">{history.length} routed prompts</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-nd-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} /> Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-nd-muted text-sm">
          No prompts routed yet. Try the Smart Router.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map(item => {
            const model = models.find(m => m.id === item.selected_provider_id);
            return (
              <div
                key={item.id}
                onClick={() => openFromHistory(item)}
                className="bg-nd-panel border border-nd-border rounded-xl p-4 cursor-pointer hover:border-nd-accent transition-all"
              >
                <p className="text-nd-text text-sm mb-2 line-clamp-2">{item.prompt_text}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {model && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ background: model.color || '#7c3aed' }}
                    >
                      → {model.name}
                    </span>
                  )}
                  {item.recommended_providers?.slice(1, 3).map(pid => {
                    const m2 = models.find(m => m.id === pid);
                    return m2 ? (
                      <span key={pid} className="text-xs text-nd-muted border border-nd-border px-2 py-0.5 rounded-full">
                        {m2.name}
                      </span>
                    ) : null;
                  })}
                  <span className="text-nd-muted text-xs ml-auto">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
