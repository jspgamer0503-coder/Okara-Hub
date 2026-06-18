const logoFetcher = require('./logo-fetcher');
const updater    = require('./updater');
const { app, BrowserWindow, BrowserView, ipcMain, session, clipboard, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;
const VITE_PORT = process.env.VITE_DEV_PORT || '5173';
const VITE_URL = `http://localhost:${VITE_PORT}`;
const CONFIG_DIR = path.join(os.homedir(), '.config', 'neural-dock');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'neural-dock.log');

// ─── Logging ────────────────────────────────────────────────────────────────
const MAX_LOG_LINES = 500;
let logLines = [];

function log(level, tag, msg) {
  const entry = { ts: new Date().toISOString(), level, tag, msg };
  logLines.push(entry);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (_) {}
  console.log(`[${level}][${tag}] ${msg}`);
}

// ─── Config ──────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  models: [
    { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com',           color: '#10a37f', tags: ['general','code','writing'],           enabled: true, isDefault: true, sortOrder: 0 },
    { id: 'claude',     name: 'Claude',     url: 'https://claude.ai',             color: '#d97757', tags: ['reasoning','writing','analysis'],      enabled: true, isDefault: true, sortOrder: 1 },
    { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com',     color: '#4285f4', tags: ['general','multimodal','search'],       enabled: true, isDefault: true, sortOrder: 2 },
    { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai',     color: '#20b2aa', tags: ['research','search','news'],            enabled: true, isDefault: true, sortOrder: 3 },
    { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com',     color: '#1e40af', tags: ['code','math','reasoning'],             enabled: true, isDefault: true, sortOrder: 4 },
    { id: 'mistral',    name: 'Mistral',    url: 'https://chat.mistral.ai',       color: '#ff7000', tags: ['code','multilingual'],                 enabled: true, isDefault: true, sortOrder: 5 },
    { id: 'grok',       name: 'Grok',       url: 'https://grok.com',              color: '#1da1f2', tags: ['general','current events'],            enabled: true, isDefault: true, sortOrder: 6 },
    { id: 'meta',       name: 'Meta AI',    url: 'https://www.meta.ai',           color: '#0866ff', tags: ['general','multimodal'],               enabled: true, isDefault: true, sortOrder: 7 },
    { id: 'copilot',    name: 'Copilot',    url: 'https://copilot.microsoft.com', color: '#0078d4', tags: ['code','general','microsoft'],          enabled: true, isDefault: true, sortOrder: 8 },
    { id: 'poe',        name: 'Poe',        url: 'https://poe.com',               color: '#8b5cf6', tags: ['general','multi-model'],               enabled: false, isDefault: true, sortOrder: 9 },
    { id: 'cohere',     name: 'Cohere',     url: 'https://coral.cohere.com',      color: '#39d353', tags: ['code','enterprise'],                   enabled: false, isDefault: true, sortOrder: 10 },
    { id: 'you',        name: 'You.com',    url: 'https://you.com',               color: '#ff4785', tags: ['search','research'],                   enabled: false, isDefault: true, sortOrder: 11 },
  ],
  routerRules: [
    { id: 'r1', keyword: 'code',      tag: 'code',      weights: { chatgpt: 8, deepseek: 10, claude: 7, mistral: 6 } },
    { id: 'r2', keyword: 'debug',     tag: 'code',      weights: { chatgpt: 8, deepseek: 10, claude: 7 } },
    { id: 'r3', keyword: 'fix',       tag: 'code',      weights: { deepseek: 9, chatgpt: 8, claude: 7 } },
    { id: 'r4', keyword: 'math',      tag: 'math',      weights: { deepseek: 10, claude: 8, chatgpt: 7 } },
    { id: 'r5', keyword: 'research',  tag: 'research',  weights: { perplexity: 10, claude: 7, gemini: 8 } },
    { id: 'r6', keyword: 'search',    tag: 'search',    weights: { perplexity: 10, you: 9, gemini: 7 } },
    { id: 'r7', keyword: 'write',     tag: 'writing',   weights: { claude: 10, chatgpt: 8, gemini: 7 } },
    { id: 'r8', keyword: 'translate', tag: 'multilingual', weights: { mistral: 10, gemini: 9, chatgpt: 8 } },
    { id: 'r9', keyword: 'image',     tag: 'multimodal', weights: { gemini: 10, chatgpt: 8, meta: 7 } },
    { id: 'r10', keyword: 'news',     tag: 'news',      weights: { perplexity: 10, grok: 9, you: 8 } },
    { id: 'r11', keyword: 'analyze',  tag: 'analysis',  weights: { claude: 10, chatgpt: 8, gemini: 7 } },
    { id: 'r12', keyword: 'summarize', tag: 'analysis', weights: { claude: 10, chatgpt: 8 } },
  ],
  promptHistory: [],
  preferences: {
    theme: 'mocha',
    adBlockEnabled: true,
    activeModel: null,
  },
  windowBounds: { width: 1280, height: 800, x: null, y: null },
};

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    // Merge defaults for any missing keys
    return { ...DEFAULT_CONFIG, ...raw, preferences: { ...DEFAULT_CONFIG.preferences, ...raw.preferences } };
  } catch (e) {
    log('ERROR', 'CONFIG', `Failed to load config: ${e.message}`);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (e) {
    log('ERROR', 'CONFIG', `Failed to save config: ${e.message}`);
  }
}

let config = loadConfig();

// ─── Ad Blocking ─────────────────────────────────────────────────────────────
// ─── Ad Block lists ──────────────────────────────────────────────────────────
const AD_DOMAINS = [
  // Ads
  'doubleclick.net','googlesyndication.com','adservice.google.com','ads.google.com',
  'amazon-adsystem.com','advertising.com','adnxs.com','criteo.com','outbrain.com',
  'taboola.com','moatads.com','rubiconproject.com','openx.net','casalemedia.com',
  'media.net','smartadserver.com','pubmatic.com','33across.com','sovrn.com',
  'bidswitch.net','lijit.com','appnexus.com','indexexchange.com','triplelift.com',
  'sharethrough.com','yieldmo.com','spotxchange.com','springserve.com',
  'advertising.com','trafficjunky.net','propellerads.com','mgid.com',
  // Analytics / tracking
  'scorecardresearch.com','quantserve.com','hotjar.com','mouseflow.com',
  'mixpanel.com','segment.com','fullstory.com','heap.io','amplitude.com',
  'analytics.google.com','google-analytics.com','googletagmanager.com',
  'googleoptimize.com','optimize.google.com',
  'clarity.ms','bat.bing.com',
  'newrelic.com','nr-data.net','datadog-browser-agent.com',
  'sentry.io','bugsnag.com','rollbar.com',
  'intercom.io','intercomcdn.com','crisp.chat','freshchat.com',
  'zendesk.com','zdassets.com',
  // Social pixels
  'facebook.net','fbcdn.net','pixel.facebook.com','connect.facebook.net',
  'twitter.com/i/jot','analytics.twitter.com','t.co/i/',
  'linkedin.com/li/track','snap.licdn.com',
  'tiktok.com/i18n','analytics.tiktok.com',
  // CDN-hosted trackers
  'cdn.heapanalytics.com','cdn.segment.com','cdn.mxpnl.com',
];

// Track blocked-request stats for the UI
let adBlockStats = { total: 0, byDomain: {} };

function recordBlock(domain) {
  adBlockStats.total++;
  adBlockStats.byDomain[domain] = (adBlockStats.byDomain[domain] || 0) + 1;
}

function matchesBlocklist(url) {
  return AD_DOMAINS.some(d => url.includes(d));
}

// Sessions we have already attached a listener to (avoid duplicates)
const hookedSessions = new WeakSet();

function setupAdBlock(ses) {
  if (hookedSessions.has(ses)) return;
  hookedSessions.add(ses);

  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    if (!config.preferences.adBlockEnabled) return callback({ cancel: false });

    const url = details.url;
    const matched = AD_DOMAINS.find(d => url.includes(d));
    if (matched) {
      recordBlock(matched);
      log('ADBLOCK', 'BLOCK', `[${matched}] ${url.substring(0, 100)}`);
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });
  log('INFO', 'ADBLOCK', `Ad blocker attached to session: ${ses.storagePath || 'default'}`);
}

// ─── BrowserView Management ───────────────────────────────────────────────────
let mainWindow = null;
const browserViews = new Map(); // modelId → BrowserView
let activeViewId = null;
let sidebarWidth = 280;
const TITLEBAR_HEIGHT = 36;
const TABBAR_HEIGHT = 36;

function getViewBounds(win) {
  const [w, h] = win.getContentSize();
  return {
    x: sidebarWidth,
    y: TITLEBAR_HEIGHT + TABBAR_HEIGHT,
    width: Math.max(0, w - sidebarWidth),
    height: Math.max(0, h - TITLEBAR_HEIGHT - TABBAR_HEIGHT),
  };
}

function showView(modelId) {
  if (!mainWindow) return;
  // Hide all
  for (const [id, view] of browserViews) {
    if (id !== modelId) {
      try { mainWindow.removeBrowserView(view); } catch (_) {}
    }
  }
  if (!modelId) { activeViewId = null; return; }

  if (!browserViews.has(modelId)) {
    const model = config.models.find(m => m.id === modelId);
    if (!model) return;
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: `persist:model-${modelId}`,
      }
    });
    // ← Attach ad blocker to THIS view's dedicated session before any requests fire
    setupAdBlock(view.webContents.session);
    browserViews.set(modelId, view);
    mainWindow.addBrowserView(view);
    view.setBounds(getViewBounds(mainWindow));
    view.setAutoResize({ width: true, height: true });
    log('INFO', 'BROWSER', `Loading ${model.name} at ${model.url}`);
    view.webContents.loadURL(model.url).catch(e => {
      log('ERROR', 'BROWSER', `Failed to load ${model.url}: ${e.message}`);
    });
    view.webContents.setMaxListeners(20);
    view.webContents.on('did-fail-load', (e, code, desc) => {
      log('ERROR', 'BROWSER', `Load failed ${model.url}: ${desc}`);
    });
  } else {
    mainWindow.addBrowserView(browserViews.get(modelId));
  }
  const view = browserViews.get(modelId);
  view.setBounds(getViewBounds(mainWindow));
  activeViewId = modelId;
}

function hideAllViews() {
  if (!mainWindow) return;
  for (const view of browserViews.values()) {
    try { mainWindow.removeBrowserView(view); } catch (_) {}
  }
  activeViewId = null;
}

// ─── Main Window ─────────────────────────────────────────────────────────────
function createWindow() {
  const { width, height, x, y } = config.windowBounds;
  process.setMaxListeners(30);
  mainWindow = new BrowserWindow({
    width, height,
    ...(x != null ? { x } : {}),
    ...(y != null ? { y } : {}),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Setup ad blocking on main window session
  setupAdBlock(mainWindow.webContents.session);

  if (isDev) {
    mainWindow.loadURL(VITE_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  globalShortcut.register('CommandOrControl+W', () => { if (mainWindow) mainWindow.close(); });
  globalShortcut.register('CommandOrControl+R', () => { if (mainWindow) mainWindow.webContents.send('reload-current'); });
  globalShortcut.register('CommandOrControl+Shift+R', () => { if (mainWindow) mainWindow.webContents.send('reload-all'); });

  mainWindow.setMaxListeners(30);

  mainWindow.on('resize', () => {
    if (activeViewId && browserViews.has(activeViewId)) {
      browserViews.get(activeViewId).setBounds(getViewBounds(mainWindow));
    }
    const [w, h] = mainWindow.getSize();
    const [bx, by] = mainWindow.getPosition();
    config.windowBounds = { width: w, height: h, x: bx, y: by };
    saveConfig(config);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  log('INFO', 'APP', 'Main window created');
  updater.init(mainWindow, log);

  // Fetch/refresh logos in the background — won't block the window from opening
  setImmediate(async () => {
    try {
      log('INFO', 'LOGOS', 'Starting background logo refresh...');
      await logoFetcher.updateAllLogos(config.models, log, false);
      log('INFO', 'LOGOS', 'Logo refresh complete');
      // Notify renderer so it re-renders avatars
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('logos:allUpdated');
      }
    } catch (e) {
      log('ERROR', 'LOGOS', `Logo refresh failed: ${e.message}`);
    }
  });
}

app.whenReady().then(() => {
  log('INFO', 'APP', `Neural Dock starting (Electron ${process.versions.electron})`);
  // Hook the default session as a catch-all safety net
  const { session: electronSession } = require('electron');
  setupAdBlock(electronSession.defaultSession);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Config
ipcMain.handle('config:get', () => config);
ipcMain.handle('config:save', (_, newConfig) => { config = newConfig; saveConfig(config); return true; });

// Models
ipcMain.handle('models:list', () => config.models);
ipcMain.handle('models:save', (_, models) => {
  config.models = models;
  saveConfig(config);
  log('INFO', 'MODELS', `Saved ${models.length} models`);
  return true;
});

// Browser views
ipcMain.handle('browser:open', (_, modelId) => {
  log('INFO', 'ROUTER', `Opening model: ${modelId}`);
  showView(modelId);
  config.preferences.activeModel = modelId;
  saveConfig(config);
  return true;
});
ipcMain.handle('browser:close', (_, modelId) => {
  if (browserViews.has(modelId)) {
    const view = browserViews.get(modelId);
    try { mainWindow.removeBrowserView(view); } catch (_) {}
    view.webContents.destroy();
    browserViews.delete(modelId);
  }
  if (activeViewId === modelId) { activeViewId = null; }
  return true;
});
ipcMain.handle('browser:hide', () => { hideAllViews(); return true; });
ipcMain.handle('browser:reload', (_, modelId) => {
  if (browserViews.has(modelId)) browserViews.get(modelId).webContents.reload();
  return true;
});
ipcMain.handle('browser:navigate', (_, modelId, url) => {
  if (browserViews.has(modelId)) browserViews.get(modelId).webContents.loadURL(url);
  return true;
});
ipcMain.handle('browser:openExternal', (_, url) => { shell.openExternal(url); return true; });
ipcMain.handle('browser:setSidebarWidth', (_, w) => {
  sidebarWidth = w;
  if (activeViewId && browserViews.has(activeViewId)) {
    browserViews.get(activeViewId).setBounds(getViewBounds(mainWindow));
  }
  return true;
});

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// Logs
ipcMain.handle('logs:get', () => logLines);
ipcMain.handle('logs:clear', () => {
  logLines = [];
  try { fs.writeFileSync(LOG_FILE, ''); } catch (_) {}
  return true;
});
ipcMain.handle('logs:copy', () => {
  const text = logLines.map(l => `[${l.ts}][${l.level}][${l.tag}] ${l.msg}`).join('\n');
  clipboard.writeText(text);
  return true;
});

// Reload handlers (triggered by global shortcuts)
ipcMain.handle('reload:current', () => {
  if (activeViewId && browserViews.has(activeViewId)) {
    browserViews.get(activeViewId).webContents.reload();
  }
});
ipcMain.handle('reload:all', () => {
  for (const [, view] of browserViews) {
    view.webContents.reload();
  }
});

// Ad block stats
ipcMain.handle('adblock:stats', () => adBlockStats);
ipcMain.handle('adblock:reset', () => { adBlockStats = { total: 0, byDomain: {} }; return true; });

// Prompt history
ipcMain.handle('history:list', () => config.promptHistory || []);
ipcMain.handle('history:add', (_, entry) => {
  config.promptHistory = [entry, ...(config.promptHistory || [])].slice(0, 100);
  saveConfig(config);
  return true;
});
ipcMain.handle('history:clear', () => {
  config.promptHistory = [];
  saveConfig(config);
  return true;
});

// Router rules
ipcMain.handle('rules:list', () => config.routerRules || []);
ipcMain.handle('rules:save', (_, rules) => {
  config.routerRules = rules;
  saveConfig(config);
  return true;
});

// Preferences
ipcMain.handle('prefs:get', () => config.preferences);
ipcMain.handle('prefs:save', (_, prefs) => {
  config.preferences = { ...config.preferences, ...prefs };
  saveConfig(config);
  return true;
});

// Translation using external AI
ipcMain.handle('translate:request', async (_, { text, sourceLang, targetLang, modelId }) => {
  const model = config.models.find(m => m.id === modelId);
  log('INFO', 'TRANSLATOR', `Translate ${sourceLang}→${targetLang} via ${model?.name || modelId}`);
  // Open the translation model with a pre-filled prompt
  const prompt = encodeURIComponent(`Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translation, no explanation:\n\n${text}`);
  if (model) {
    showView(modelId);
    config.preferences.activeModel = modelId;
    saveConfig(config);
  }
  return { success: true, modelUrl: model?.url };
});

// ─── Logo handlers ────────────────────────────────────────────────────────────

// Get all logos as data URIs in one call
ipcMain.handle('logos:getAll', () => {
  const results = {};
  for (const model of config.models) {
    results[model.id] = logoFetcher.getLogoDataUri(model.id);
  }
  return results;
});

// Get single logo
ipcMain.handle('logos:get', (_, modelId) => logoFetcher.getLogoDataUri(modelId));

// Fetch logo for a newly added custom model
ipcMain.handle('logos:fetchForModel', async (_, model) => {
  const filePath = await logoFetcher.fetchLogoForModel(model, log);
  if (filePath) {
    // Notify renderer that logo is ready
    mainWindow?.webContents.send('logos:updated', { modelId: model.id, dataUri: logoFetcher.getLogoDataUri(model.id) });
    return true;
  }
  return false;
});

// Force refresh all logos
ipcMain.handle('logos:refreshAll', async () => {
  await logoFetcher.updateAllLogos(config.models, log, true);
  mainWindow?.webContents.send('logos:allUpdated');
  return true;
});

// ─── Updater handlers ─────────────────────────────────────────────────────────
ipcMain.handle('updater:check',   () => updater.checkForUpdate(false));
ipcMain.handle('updater:install', (_, { url, version }) => updater.downloadAndInstall(url, version));
ipcMain.handle('updater:version', () => updater.CURRENT_VERSION);

