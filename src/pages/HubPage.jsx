import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { isElectron } from '../lib/utils';
import ModelAvatar from '../components/ModelAvatar';

export default function HubPage() {
  const { models, openTab } = useApp();
  const enabled = models.filter(m => m.enabled !== false);

  if (enabled.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-nd-muted">
        No models enabled. Go to Settings to enable some.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Neural Dock</h1>
        <p className="text-nd-muted text-sm mt-1">Select an AI provider or type a prompt in the sidebar</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {enabled.map((model) => (
          <button
            key={model.id}
            onClick={() => openTab(model)}
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-nd-border bg-nd-panel hover:border-nd-accent hover:bg-nd-row transition-all"
          >
            <div className="transition-transform group-hover:scale-110">
              <ModelAvatar model={model} size={52} />
            </div>

            <span className="text-white text-sm font-semibold">{model.name}</span>

            {model.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {model.tags.slice(0, 2).map(t => (
                  <span key={t} className="text-xs text-nd-muted bg-nd-bar px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isElectron) window.electronAPI.openExternal(model.url);
                else window.open(model.url, '_blank');
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-nd-muted hover:text-nd-accent transition-all"
              title="Open in browser"
            >
              <ExternalLink size={13} />
            </button>

            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
              style={{ background: model.color || '#7c3aed' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
