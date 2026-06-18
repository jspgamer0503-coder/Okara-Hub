<div align="center">

# Okara Hub

**All your AI assistants. One desktop app.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Platform](https://img.shields.io/badge/Platform-Linux-FCC624?logo=linux&logoColor=black)](https://github.com/YOUR_USERNAME/okara-hub/releases)

[Download](#installation) · [Features](#features) · [Providers](#built-in-providers) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is Okara Hub?

Okara Hub is a cross-platform Electron desktop application that embeds all your favourite AI providers — ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and more — into a single, unified window. Stop context-switching between browser tabs. A smart keyword router automatically sends your prompt to the best model for the job.

## Features

| Feature | Description |
|---|---|
| 🧠 **Smart Router** | Routes prompts to the best AI based on configurable keyword rules and weights |
| 🌐 **Embedded Browser Views** | Native `BrowserView` per provider — no iframe restrictions |
| 🛡️ **Ad & Analytics Blocker** | Network-level blocking applied to every provider session |
| 📋 **Prompt History** | Full log of every routed prompt with timestamps |
| 🔧 **Log Viewer** | Filter by `INFO` / `ERROR` / `ADBLOCK` / `ROUTER`, copy or clear |
| 🌍 **Translator** | Send translation requests directly to any AI in one click |
| ⚙️ **Model Management** | Enable/disable built-ins, add custom providers with any URL |
| 💾 **Persistent Config** | Auto-saved to `~/.config/okara-hub/config.json` |
| 🔄 **Auto-updater** | In-app update banner with one-click install |
| ⌨️ **Keyboard Shortcuts** | Close window, reload provider, or reload all providers via `Ctrl/Cmd+W/R/Shift+R` |
| 📦 **Zero manual setup** | Runs out of the box after `npm install` |

## Built-in Providers

| Provider | Best for |
|---|---|
| ChatGPT | General, code, writing |
| Claude | Reasoning, writing, analysis |
| Gemini | Multimodal, search |
| Perplexity | Research, real-time search |
| DeepSeek | Code, math, reasoning |
| Mistral | Code, multilingual |
| Grok | General, current events |
| Meta AI | General, multimodal |
| Copilot | Code, Microsoft ecosystem |
| Poe *(off by default)* | Multi-model access |
| Cohere *(off by default)* | Enterprise, code |
| You.com *(off by default)* | Search, research |

Custom providers can be added from **Settings → Models**.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) **20 or higher**
- Linux (Debian/Ubuntu recommended for `.deb` builds)

### Run from source

```bash
git clone https://github.com/YOUR_USERNAME/okara-hub.git
cd okara-hub
npm install
npm run dev        # Launches Vite + Electron with hot reload
```

### Build a distributable

```bash
npm run build              # .deb package
npm run build:appimage     # AppImage (portable)
npm run build:all          # .deb + AppImage
```

Built packages are written to `dist-electron/`.

### Using the release script

```bash
./release.sh 1.1.0 "- Fixed ad blocker\n- Added Groq provider"
```

This bumps `package.json`, builds the `.deb`, updates `latest.json`, and prints instructions for uploading to GitHub Releases.

## Configuration

| Path | Purpose |
|---|---|
| `~/.config/okara-hub/config.json` | Models, router rules, preferences |
| `~/.config/okara-hub/okara-hub.log` | Runtime log |

Config is created automatically on first launch. You can also edit it manually — the app reloads settings on next start.

## Router Rules

Rules are stored in `config.json` under `routerRules`. Each rule maps a keyword to a tag and assigns weights to models:

```json
{
  "id": "r1",
  "keyword": "code",
  "tag": "code",
  "weights": { "deepseek": 10, "chatgpt": 8, "claude": 7 }
}
```

The model with the highest cumulative weight for the matched keywords wins.

## Project Structure

```
okara-hub/
├── electron/          # Main process (main.js, preload.js, updater.js)
├── src/
│   ├── components/    # TitleBar, TabBar, Sidebar, UpdateBanner, ModelAvatar
│   ├── lib/           # AppContext, router logic, IPC helpers, utils
│   └── pages/         # HubPage, RouterPage, SettingsPage, HistoryPage, LogsPage, TranslatorPage
├── build/             # Icons and Debian post-install scripts
├── scripts/           # Dev helpers (logo fetcher, wait-and-launch)
├── public/            # Static assets
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+W` / `Cmd+W` | Close the application window |
| `Ctrl+R` / `Cmd+R` | Reload the currently active AI provider view |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Reload all open AI provider views |

## Known Issues

- **Updater requires `GH_TOKEN` in dev mode** — The auto-updater checks for new versions against GitHub Releases. When running from source (`npm run dev`), you must set the `GH_TOKEN` environment variable to a [GitHub personal access token](https://github.com/settings/tokens) with `repo` scope. Otherwise the update check will fail silently.

## License

[MIT](LICENSE) © 2026 Okara Hub
