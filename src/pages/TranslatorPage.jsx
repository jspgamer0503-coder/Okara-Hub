import React, { useState } from 'react';
import { Languages, ArrowRight, Send, Copy, Check } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { isElectron } from '../lib/utils';

const LANGUAGES = [
  'English','Spanish','French','German','Italian','Portuguese','Dutch','Russian',
  'Chinese (Simplified)','Chinese (Traditional)','Japanese','Korean','Arabic',
  'Hindi','Turkish','Polish','Swedish','Norwegian','Danish','Finnish',
  'Czech','Hungarian','Romanian','Greek','Hebrew','Thai','Vietnamese','Indonesian',
];

export default function TranslatorPage({ onNavigate }) {
  const { models, openTab } = useApp();
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);

  const enabledModels = models.filter(m => m.enabled !== false);
  const activeModelId = selectedModelId || enabledModels[0]?.id;

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setTranslating(true);
    const model = models.find(m => m.id === activeModelId);
    if (!model) return;

    if (isElectron) {
      await window.electronAPI.translateRequest({
        text: sourceText,
        sourceLang,
        targetLang,
        modelId: activeModelId,
      });
    } else {
      await openTab(model);
    }
    onNavigate('hub');
    setTranslating(false);
  };

  const handleSendAsPrompt = async () => {
    const model = models.find(m => m.id === activeModelId);
    if (model) { await openTab(model); onNavigate('hub'); }
  };

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-nd-accent flex items-center justify-center">
          <Languages size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Translator</h1>
          <p className="text-nd-muted text-xs">Translate text using your AI models</p>
        </div>
      </div>

      {/* Language selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-nd-muted text-xs mb-1 block">From</label>
          <select
            value={sourceLang}
            onChange={e => setSourceLang(e.target.value)}
            className="w-full px-3 py-2 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
          >
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="mt-5">
          <ArrowRight size={16} className="text-nd-muted" />
        </div>
        <div className="flex-1">
          <label className="text-nd-muted text-xs mb-1 block">To</label>
          <select
            value={targetLang}
            onChange={e => setTargetLang(e.target.value)}
            className="w-full px-3 py-2 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-lg focus:outline-none focus:border-nd-accent"
          >
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Model selector */}
      <div>
        <label className="text-nd-muted text-xs mb-1 block">AI Model</label>
        <div className="flex gap-2 flex-wrap">
          {enabledModels.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModelId(m.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                activeModelId === m.id
                  ? 'border-nd-accent text-white'
                  : 'border-nd-border text-nd-muted hover:border-nd-accent hover:text-white'
              }`}
              style={activeModelId === m.id ? { background: `${m.color}22` } : {}}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Text area */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-nd-muted text-xs mb-1 block">Source Text</label>
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder={`Enter ${sourceLang} text to translate...`}
            className="w-full px-3 py-2.5 bg-nd-panel border border-nd-border text-nd-text text-sm rounded-xl focus:outline-none focus:border-nd-accent resize-none h-36"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-nd-bar border border-nd-border rounded-xl p-4 text-sm text-nd-muted">
        <p className="text-white text-xs font-medium mb-1">How it works</p>
        <p className="text-xs leading-relaxed">
          This opens the selected AI in its tab with your translation request pre-formatted as a prompt.
          The AI will translate <strong className="text-nd-text">{sourceLang} → {targetLang}</strong>.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || translating}
          className="flex items-center gap-2 px-4 py-2.5 bg-nd-accent hover:bg-nd-accent-light text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          <Languages size={16} />
          {translating ? 'Opening...' : 'Translate with AI'}
        </button>
        <button
          onClick={handleSendAsPrompt}
          disabled={!sourceText.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-nd-bar border border-nd-border text-nd-text text-sm rounded-xl hover:bg-nd-row transition-colors disabled:opacity-50"
        >
          <Send size={14} /> Send to AI
        </button>
      </div>
    </div>
  );
}
