import React, { useState, useCallback } from 'react';
import { Zap, Settings, History, Globe, Bug, Languages, Search, ChevronRight } from 'lucide-react';
import { cn, isElectron } from '../lib/utils';
import { scoreModels, getBestMatch } from '../lib/router';
import { useApp } from '../lib/AppContext';
import ModelAvatar from './ModelAvatar';
import { APP_ICON_LARGE } from '../lib/appIcon';

const NAV_ITEMS = [
  { id: 'hub',        label: 'Hub',          Icon: Globe },
  { id: 'router',     label: 'Smart Router', Icon: Zap },
  { id: 'translator', label: 'Translator',   Icon: Languages },
  { id: 'history',    label: 'History',      Icon: History },
  { id: 'logs',       label: 'Bug Tracker',  Icon: Bug },
  { id: 'settings',   label: 'Settings',     Icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate }) {
  const { models, rules, openTab, openTabs, activeTabId } = useApp();
  const [prompt, setPrompt] = useState('');
  const [scored, setScored] = useState([]);
  const [bestId, setBestId] = useState(null);

  const handlePromptChange = useCallback((e) => {
    const text = e.target.value;
    setPrompt(text);
    if (text.trim()) {
      const results = scoreModels(text, rules, models);
      setScored(results);
      setBestId(getBestMatch(results)?.id || null);
    } else {
      setScored([]);
      setBestId(null);
    }
  }, [rules, models]);

  const handlePromptEnter = useCallback(async (e) => {
    if (e.key !== 'Enter' || !prompt.trim()) return;
    const results = scored.length > 0 ? scored : scoreModels(prompt, rules, models);
    const best = getBestMatch(results);
    if (best) {
      await openTab(best);
      onNavigate('hub');
      setPrompt('');
      setScored([]);
    }
  }, [prompt, scored, rules, models, openTab, onNavigate]);

  const enabledModels = models.filter(m => m.enabled !== false);
  const displayModels = scored.length > 0 ? scored : enabledModels;

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col h-full bg-nd-panel border-r border-nd-border">
      {/* Smart Prompt Input */}
      <div className="p-3 border-b border-nd-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nd-muted" />
          <input
            type="text"
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handlePromptEnter}
            placeholder="Type a prompt to route..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-nd-bar border border-nd-border rounded-lg text-nd-text placeholder-nd-muted focus:outline-none focus:border-nd-accent transition-colors"
          />
        </div>
        {prompt && (
          <p className="text-nd-muted text-xs mt-1 px-1">↵ Enter to open best match</p>
        )}
      </div>

      {/* Model List */}
      <div className="flex-1 overflow-y-auto py-2">
        {scored.length > 0 && (
          <p className="text-nd-muted text-xs px-3 py-1 uppercase tracking-wide font-medium">Recommendations</p>
        )}
        {displayModels.slice(0, scored.length > 0 ? 5 : 50).map((model, i) => {
          const isActive = activeTabId === model.id;
          const isOpen = openTabs.some(t => t.id === model.id);
          const isBest = scored.length > 0 && i === 0 && model.id === bestId;
          return (
            <button
              key={model.id}
              onClick={async () => { await openTab(model); onNavigate('hub'); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-all hover:bg-nd-row',
                isActive && 'bg-nd-row border-r-2 border-nd-accent'
              )}
            >
              <ModelAvatar model={model} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-sm font-medium truncate', isActive ? 'text-white' : 'text-nd-text-dim')}>
                    {model.name}
                  </span>
                  {isBest && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-nd-accent text-white font-medium flex-shrink-0">BEST</span>
                  )}
                  {scored.length > 0 && model.score > 0 && (
                    <span className="text-xs text-nd-muted ml-auto flex-shrink-0">+{model.score}</span>
                  )}
                </div>
                {model.tags?.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {model.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-xs text-nd-muted">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {isOpen && <div className="w-1.5 h-1.5 rounded-full bg-nd-accent flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="border-t border-nd-border py-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => {
              onNavigate(id);
              if (id === 'hub' && isElectron) {
                if (activeTabId) window.electronAPI.openBrowser(activeTabId);
                else window.electronAPI.hideBrowser();
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-all hover:bg-nd-row',
              currentPage === id ? 'text-nd-accent-light' : 'text-nd-muted hover:text-nd-text'
            )}
          >
            <Icon size={15} />
            <span className="text-xs font-medium">{label}</span>
            {currentPage === id && <ChevronRight size={12} className="ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}
