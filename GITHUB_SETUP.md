# GitHub Setup Checklist

Before pushing to GitHub, complete these one-time steps:

## 1. Replace placeholders

Search the repo for `YOUR_USERNAME` and replace with your actual GitHub username:

```bash
grep -r "YOUR_USERNAME" .
```

Files to update:
- `README.md` — badge links and clone URL
- `.github/ISSUE_TEMPLATE/config.yml` — discussions link
- `package.json` — `"owner": "GITHUB_USERNAME"` in the `publish` block
- `package.json` — `"homepage"` field

## 2. Create the GitHub repo

```bash
gh repo create okara-hub --public --source=. --remote=origin --push
```

Or via the GitHub web UI, then:

```bash
git init
git add .
git commit -m "feat: initial commit"
git remote add origin https://github.com/YOUR_USERNAME/okara-hub.git
git push -u origin main
```

## 3. Enable GitHub Actions

Actions are enabled by default on new repos. Workflows run on:
- Every push to `main` or `dev` → CI (lint + build check)
- Every `v*.*.*` tag push → Release (builds `.deb` + `AppImage`, uploads to Releases)

## 4. Publish a release

```bash
./release.sh 1.0.0 "Initial public release"
git tag v1.0.0
git push origin v1.0.0
```

The release workflow will build and attach the packages automatically.

## 5. Optional: add topics to the repo

Suggested GitHub topics: `electron`, `ai`, `desktop-app`, `chatgpt`, `claude`, `gemini`, `linux`, `vite`, `react`
