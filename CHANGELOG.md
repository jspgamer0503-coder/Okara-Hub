# Changelog

All notable changes to Okara Hub are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [1.1.0] — 2026-06-17

### Fixed
- Updater: replaced no-op stub with real electron-updater (GitHub feed, progress events, auto-install)
- Source tree: restored missing src/ and electron/ directories from archive
- Branding: renamed "neural-dock" to "okara-hub" across package.json and config paths

### Added
- Keyboard shortcuts: Ctrl/Cmd+W (close window), Ctrl/Cmd+R (reload current provider), Ctrl/Cmd+Shift+R (reload all providers)

### Removed
- react-router-dom dependency (never imported)
- Unused Vite boilerplate (src/assets/react.svg, src/App.css unused styles)

## [1.0.0] — 2026-03-10

### Added
- Initial release
- Embedded `BrowserView` per provider (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Mistral, Grok, Meta AI, Copilot)
- Smart keyword router with configurable weights
- Network-level ad and analytics blocker
- Prompt history log
- Log viewer with `INFO` / `ERROR` / `ADBLOCK` / `ROUTER` filters
- Translator page — send translation requests to any provider
- Settings page — enable/disable providers, add custom providers, manage router rules
- Auto-updater with in-app banner
- Persistent config at `~/.config/okara-hub/config.json`
- `.deb` and `AppImage` build targets
