#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Neural Dock — Release Script
#
#  Usage:  ./release.sh 1.1.0 "- Fixed ad blocker\n- New Groq provider"
#
#  What it does:
#   1. Bumps version in package.json
#   2. Builds the .deb
#   3. Updates latest.json with new version + download URL
#   4. Prints instructions to upload to GitHub Releases
# ─────────────────────────────────────────────────────────────────────────────
set -e

VERSION="${1:-}"
NOTES="${2:-No release notes provided}"

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version> \"<release notes>\""
  echo "Example: ./release.sh 1.1.0 \"- Fixed ad blocker\n- Added Groq\""
  exit 1
fi

echo ""
echo "🚀  Neural Dock — Release v${VERSION}"
echo ""

# 1. Bump version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '${VERSION}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅  package.json → v${VERSION}');
"

# 2. Build the .deb
./build.sh

DEB="dist-electron/neural-dock_${VERSION}_amd64.deb"
SIZE=$(stat -c%s "$DEB" 2>/dev/null || echo 0)
DATE=$(date +%Y-%m-%d)

# 3. Update latest.json
# Read GitHub username from git remote if available
GITHUB_USER=$(git remote get-url origin 2>/dev/null | sed -n 's|.*github.com[:/]\([^/]*\)/.*|\1|p' || echo "YOUR_GITHUB_USERNAME")

node -e "
const fs = require('fs');
const feed = {
  version: '${VERSION}',
  date: '${DATE}',
  notes: '${NOTES}'.replace(/\\\\n/g, '\n'),
  platforms: {
    linux: {
      url: 'https://github.com/${GITHUB_USER}/neural-dock/releases/download/v${VERSION}/neural-dock_${VERSION}_amd64.deb',
      size: ${SIZE}
    }
  }
};
fs.writeFileSync('latest.json', JSON.stringify(feed, null, 2));
console.log('✅  latest.json updated');
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Release v${VERSION} built: ${DEB}"
echo ""
echo "📋  Next steps to publish the update:"
echo ""
echo "  1. Create a GitHub repo called 'neural-dock' at https://github.com/new"
echo ""
echo "  2. Push this project:"
echo "       git init && git add -A && git commit -m 'v${VERSION}'"
echo "       git remote add origin https://github.com/${GITHUB_USER}/neural-dock.git"
echo "       git push -u origin main"
echo ""
echo "  3. Create a GitHub Release:"
echo "       gh release create v${VERSION} ${DEB} --title 'v${VERSION}' --notes '${NOTES}'"
echo "     (or do it manually at https://github.com/${GITHUB_USER}/neural-dock/releases/new)"
echo ""
echo "  4. Push latest.json so the app can find the update:"
echo "       git add latest.json && git commit -m 'Release v${VERSION}' && git push"
echo ""
echo "  5. Update the feed URL in electron/updater.js:"
echo "       https://raw.githubusercontent.com/${GITHUB_USER}/neural-dock/main/latest.json"
echo ""
echo "  Once latest.json is live, all installed copies will auto-detect v${VERSION}"
echo "  within 5 seconds of next launch (or via Settings → Check for Updates)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
