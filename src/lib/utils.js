import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Check if running inside Electron
export const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

// Safe IPC call with fallback for browser dev
export async function ipc(method, ...args) {
  if (isElectron && window.electronAPI[method]) {
    return window.electronAPI[method](...args);
  }
  return null;
}
