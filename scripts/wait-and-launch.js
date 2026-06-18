#!/usr/bin/env node
/**
 * Waits for Vite to be ready on any port (5173–5180), then launches Electron.
 * This handles the case where 5173 is already in use and Vite picks another port.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const PORTS_TO_TRY = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
const POLL_INTERVAL = 500;
const TIMEOUT = 30000;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, { timeout: 1000 }, (res) => {
      res.resume();
      resolve(port);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function findVitePort() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT) {
    for (const port of PORTS_TO_TRY) {
      const found = await checkPort(port);
      if (found) return found;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error('Vite never started within 30s');
}

async function main() {
  console.log('[launcher] Waiting for Vite...');
  const port = await findVitePort();
  console.log(`[launcher] Vite ready on port ${port}, launching Electron`);

  // Tell Electron which port to use
  const env = { ...process.env, VITE_DEV_PORT: String(port) };
  const child = spawn('electron', ['.'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch(err => {
  console.error('[launcher] Error:', err.message);
  process.exit(1);
});
