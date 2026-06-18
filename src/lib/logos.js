// src/lib/logos.js
// Logos are fetched from official provider domains by the Electron main process.
// This module exposes a React hook that stays in sync with the logo cache.
// In browser dev mode (no Electron), everything returns null gracefully.

import { useState, useEffect } from 'react';
import { isElectron } from './utils';

// Global cache: modelId → dataUri string
let cache = {};
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn({ ...cache }));
}

// Load all logos from main process on startup
async function loadAll() {
  if (!isElectron) return;
  try {
    const logos = await window.electronAPI.getAllLogos();
    Object.assign(cache, logos);
    notify();
  } catch (e) {
    console.warn('Could not load logos:', e);
  }
}

// Listen for background updates pushed from main process
if (isElectron) {
  loadAll();
  window.electronAPI.onLogosUpdated(() => loadAll());
  window.electronAPI.onLogoUpdated(({ modelId, dataUri }) => {
    cache[modelId] = dataUri;
    notify();
  });
}

/**
 * React hook — returns the current logo cache and re-renders when logos update.
 * Usage: const logos = useLogos();  then logos['chatgpt'] → dataUri | null
 */
export function useLogos() {
  const [logos, setLogos] = useState({ ...cache });
  useEffect(() => {
    listeners.add(setLogos);
    return () => listeners.delete(setLogos);
  }, []);
  return logos;
}

/**
 * One-shot getter (no reactivity) — use inside non-hook code.
 */
export function getLogo(modelId) {
  return cache[modelId] || null;
}
