import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ipc, isElectron } from './utils';
import { DEFAULT_RULES } from './router';

const AppContext = createContext(null);

// Fallback in-memory store for browser dev
const memStore = {
  models: [],
  rules: [],
  history: [],
  prefs: { adBlockEnabled: true, activeModel: null },
};

export function AppProvider({ children }) {
  const [models, setModels] = useState([]);
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [prefs, setPrefs] = useState({ adBlockEnabled: true, activeModel: null });
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ready, setReady] = useState(false);

  // Load everything from Electron/IPC
  useEffect(() => {
    (async () => {
      if (isElectron) {
        const [m, r, h, p] = await Promise.all([
          window.electronAPI.listModels(),
          window.electronAPI.listRules(),
          window.electronAPI.listHistory(),
          window.electronAPI.getPrefs(),
        ]);
        setModels(m || []);
        setRules(r || []);
        setHistory(h || []);
        setPrefs(p || { adBlockEnabled: true, activeModel: null });
        // Restore last active model as open tab
        if (p?.activeModel) {
          const model = m?.find(x => x.id === p.activeModel);
          if (model) {
            setOpenTabs([model]);
            setActiveTabId(model.id);
          }
        }
      } else {
        // Dev browser fallback - use defaults
        
        const defaultModels = [
          { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', color: '#10a37f', tags: ['general','code'], enabled: true },
          { id: 'claude', name: 'Claude', url: 'https://claude.ai', color: '#d97757', tags: ['reasoning','writing'], enabled: true },
          { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', color: '#4285f4', tags: ['general','multimodal'], enabled: true },
          { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', color: '#20b2aa', tags: ['research','search'], enabled: true },
          { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', color: '#1e40af', tags: ['code','math'], enabled: true },
          { id: 'mistral', name: 'Mistral', url: 'https://chat.mistral.ai', color: '#ff7000', tags: ['code','multilingual'], enabled: true },
          { id: 'grok', name: 'Grok', url: 'https://grok.com', color: '#1da1f2', tags: ['general'], enabled: true },
        ];
        setModels(defaultModels);
        setRules(DEFAULT_RULES);
      }
      setReady(true);
    })();
  }, []);

  const saveModels = useCallback(async (newModels) => {
    setModels(newModels);
    if (isElectron) await window.electronAPI.saveModels(newModels);
  }, []);

  const saveRules = useCallback(async (newRules) => {
    setRules(newRules);
    if (isElectron) await window.electronAPI.saveRules(newRules);
  }, []);

  const addHistory = useCallback(async (entry) => {
    const item = { ...entry, id: Date.now().toString(), timestamp: new Date().toISOString() };
    setHistory(prev => [item, ...prev].slice(0, 100));
    if (isElectron) await window.electronAPI.addHistory(item);
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    if (isElectron) await window.electronAPI.clearHistory();
  }, []);

  const savePrefs = useCallback(async (newPrefs) => {
    const merged = { ...prefs, ...newPrefs };
    setPrefs(merged);
    if (isElectron) await window.electronAPI.savePrefs(merged);
  }, [prefs]);

  const openTab = useCallback(async (model) => {
    if (!openTabs.find(t => t.id === model.id)) {
      setOpenTabs(prev => [...prev, model]);
    }
    setActiveTabId(model.id);
    if (isElectron) {
      await window.electronAPI.openBrowser(model.id);
    }
  }, [openTabs]);

  const closeTab = useCallback(async (modelId) => {
    const newTabs = openTabs.filter(t => t.id !== modelId);
    setOpenTabs(newTabs);
    if (activeTabId === modelId) {
      const newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      setActiveTabId(newActive);
      if (isElectron) {
        if (newActive) await window.electronAPI.openBrowser(newActive);
        else await window.electronAPI.hideBrowser();
      }
    }
    if (isElectron) await window.electronAPI.closeBrowser(modelId);
  }, [openTabs, activeTabId]);

  const switchTab = useCallback(async (modelId) => {
    if (modelId === null) {
      setActiveTabId(null);
      if (isElectron) await window.electronAPI.hideBrowser();
    } else {
      setActiveTabId(modelId);
      if (isElectron) await window.electronAPI.openBrowser(modelId);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    if (isElectron) {
      const l = await window.electronAPI.getLogs();
      setLogs(l || []);
    }
  }, []);

  return (
    <AppContext.Provider value={{
      models, rules, history, prefs, openTabs, activeTabId, logs, ready,
      setModels, saveModels, saveRules, addHistory, clearHistory, savePrefs,
      openTab, closeTab, switchTab, refreshLogs, setLogs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
