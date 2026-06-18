import React, { useState } from 'react';
import { Zap, Send, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { scoreModels } from '../lib/router';
import { cn } from '../lib/utils';
import ModelAvatar from '../components/ModelAvatar';

export default function RouterPage({ onNavigate }) {
  const { models, rules, saveRules, addHistory, openTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newWeight, setNewWeight] = useState(5);

  const handleRoute = () => {
    if (!prompt.trim()) return;
    const scored = scoreModels(prompt, rules, models);
    setResults(scored);
    addHistory({
      prompt_text: prompt,
      selected_provider_id: scored[0]?.id || '',
      recommended_providers: scored.slice(0, 3).map(p => p.id),
    });
  };

  const handleOpen = async (model) => {
    await openTab(model);
    onNavigate('hub');
  };

  const addRule = async () => {
    if (!newKeyword || !newModelId) return;
    const rule = {
      id: `r${Date.now()}`,
      keyword: newKeyword,
      weights: { [newModelId]: newWeight },
    };
    await saveRules([...rules, rule]);
    setNewKeyword('');
    setNewModelId('');
    setNewWeight(5);
  };

  const deleteRule = async (id) => {
    await saveRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-nd-accent flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Smart Router</h1>
          <p className="text-nd-muted text-xs">Route prompts to the best AI model</p>
        </div>
      </div>

      {/* Prompt tester */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">Test Prompt</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRoute())}
          placeholder="Enter a prompt to find the best AI..."
          className="w-full px-3 py-2 text-sm bg-nd-bar border border-nd-border rounded-lg text-nd-text placeholder-nd-muted focus:outline-none focus:border-nd-accent resize-none h-24"
        />
        <button
          onClick={handleRoute}
          disabled={!prompt.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-nd-accent hover:bg-nd-accent-light text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
        >
          <Send size={14} /> Route Prompt
        </button>

        {results.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-nd-muted text-xs uppercase tracking-wide">Results</p>
            {results.slice(0, 6).map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-nd-bar hover:bg-nd-row transition-colors cursor-pointer"
                onClick={() => handleOpen(m)}
              >
                <span className={cn('text-xs font-bold w-5 text-center', i === 0 ? 'text-nd-accent' : 'text-nd-muted')}>
                  {i + 1}
                </span>
                <ModelAvatar model={m} size={20} className="flex-shrink-0" />
                <span className="text-nd-text text-sm flex-1">{m.name}</span>
                {m.score > 0 && (
                  <span className="text-nd-muted text-xs">score {m.score}</span>
                )}
                {i === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-nd-accent text-white">Best fit</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules manager */}
      <div className="bg-nd-panel border border-nd-border rounded-xl p-4 flex flex-col gap-4">
        <p className="text-nd-muted text-xs font-medium uppercase tracking-wide">Routing Rules ({rules.length})</p>

        {/* Add rule */}
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-nd-muted text-xs">Keyword</label>
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="e.g. code"
              className="px-2 py-1.5 bg-nd-bar border border-nd-border text-nd-text text-sm rounded-lg w-32 focus:outline-none focus:border-nd-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-nd-muted text-xs">Model</label>
            <select
              value={newModelId}
              onChange={e => setNewModelId(e.target.value)}
              className="px-2 py-1.5 bg-nd-bar border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
            >
              <option value="">Pick model</option>
              {models.filter(m => m.enabled !== false).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-nd-muted text-xs">Weight</label>
            <input
              type="number" min={1} max={10}
              value={newWeight}
              onChange={e => setNewWeight(Number(e.target.value))}
              className="px-2 py-1.5 bg-nd-bar border border-nd-border text-nd-text text-sm rounded-lg w-16 focus:outline-none focus:border-nd-accent"
            />
          </div>
          <button
            onClick={addRule}
            disabled={!newKeyword || !newModelId}
            className="flex items-center gap-1 px-3 py-1.5 bg-nd-accent hover:bg-nd-accent-light text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Rules list */}
        <div className="flex flex-col gap-2 max-h-64 overflow-auto">
          {rules.map(rule => {
            const topModel = rule.weights ? Object.entries(rule.weights).sort((a,b) => b[1]-a[1])[0] : null;
            return (
              <div key={rule.id} className="flex items-center gap-3 p-2 rounded-lg bg-nd-bar">
                <span className="text-xs px-2 py-0.5 rounded-full border border-nd-accent text-nd-accent">{rule.keyword}</span>
                <span className="text-nd-muted text-xs flex-1">
                  → {topModel ? `${topModel[0]} (w:${topModel[1]})` : rule.provider_id || '?'}
                  {rule.weights && Object.keys(rule.weights).length > 1 && ` +${Object.keys(rule.weights).length - 1} more`}
                </span>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-nd-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {rules.length === 0 && (
            <p className="text-nd-muted text-sm text-center py-4">No rules yet. Add keywords above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
