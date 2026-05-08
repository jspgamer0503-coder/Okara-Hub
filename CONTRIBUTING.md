# Contributing to Okara Hub

Thank you for your interest in contributing! This document explains how to get set up and what the project expects from contributions.

---

## Getting started

1. **Fork** the repo and clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/okara-hub.git
   cd okara-hub
   npm install
   ```

2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/some-bug
   ```

3. **Run in dev mode** and verify your changes work:
   ```bash
   npm run dev
   ```

4. **Commit** with a clear, present-tense message:
   ```
   feat: add Groq provider
   fix: prevent ad blocker from blocking provider login
   docs: update router rule examples
   ```

5. **Push** and open a Pull Request against `main`.

---

## What to work on

Check the [Issues](../../issues) tab for open bugs and feature requests. Anything labelled `good first issue` is a great place to start.

---

## Code style

- The project uses **ESLint** — run `npx eslint src/` before committing.
- React components live in `src/components/` (reusable) or `src/pages/` (full-page views).
- Electron main-process code lives in `electron/`.
- Use Tailwind utility classes for styling; avoid inline `style` props.

---

## Adding a new AI provider

1. Open `electron/main.js` and add an entry to `DEFAULT_CONFIG.models`:
   ```js
   {
     id: 'groq',
     name: 'Groq',
     url: 'https://groq.com',
     color: '#f55036',
     tags: ['code', 'fast'],
     enabled: true,
     isDefault: false,
     sortOrder: 12,
   }
   ```
2. Optionally add router rules in `DEFAULT_CONFIG.routerRules`.
3. Add a logo to `public/logos/` (PNG, 64×64 minimum) if it can't be auto-fetched.
4. Test: open the app, go to Settings → Models, and verify the new provider appears.

---

## Reporting bugs

Please use the **Bug Report** issue template and include:

- OS and distribution
- Node.js version (`node -v`)
- Steps to reproduce
- Expected vs actual behaviour
- Relevant log lines from `~/.config/okara-hub/okara-hub.log`

---

## Pull request checklist

- [ ] Tested in `npm run dev`
- [ ] No new ESLint warnings
- [ ] `README.md` updated if behaviour changed
- [ ] Commit messages follow the format above
