#!/bin/bash
# Neural Dock — Update Script
# Run: ./update.sh
# Finds the archive automatically, applies it, restarts the app

set -e
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${NC}"; }
info() { echo -e "${CYAN}➜   $*${NC}"; }
fail() { echo -e "${RED}❌  $*${NC}"; exit 1; }

echo ""
echo -e "${BOLD}🔄  Neural Dock — Applying Update${NC}"
echo ""

# Find archive automatically
ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  ARCHIVE=$(find "$HOME/Downloads" "$HOME/Desktop" /tmp -maxdepth 4 \
    \( -name "okara-hub.tar.gz" -o -name "neural-dock.tar.gz" \) \
    -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
fi
[ -z "$ARCHIVE" ] && fail "No archive found. Download okara-hub.tar.gz from Claude first."
ok "Archive: $ARCHIVE"

# Stop app if running
pgrep -f "electron.*neural-dock\|electron.*okara-hub" > /dev/null 2>&1 \
  && info "Stopping app..." \
  && pkill -f "electron.*neural-dock\|electron.*okara-hub" 2>/dev/null; true

# Backup package.json
cp "$APP_DIR/package.json" /tmp/pkg_backup.json 2>/dev/null || true

# Extract
info "Extracting..."
EXTRACT_DIR="/tmp/nd-update-$$"
mkdir -p "$EXTRACT_DIR"
tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
NEW_SRC=$(find "$EXTRACT_DIR" -maxdepth 2 -name "package.json" | head -1 | xargs dirname)
[ -z "$NEW_SRC" ] && fail "Invalid archive"

# Sync
info "Applying files..."
rsync -a --delete \
  --exclude='node_modules/' --exclude='dist/' \
  --exclude='dist-electron/' --exclude='.git/' \
  "$NEW_SRC/" "$APP_DIR/"

# Restore homepage/author
if [ -f /tmp/pkg_backup.json ]; then
  node -e "
    const fs=require('fs');
    const o=JSON.parse(fs.readFileSync('/tmp/pkg_backup.json','utf8'));
    const n=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8'));
    if(o.homepage) n.homepage=o.homepage;
    if(o.author)   n.author=o.author;
    fs.writeFileSync('$APP_DIR/package.json',JSON.stringify(n,null,2));
  "
fi

# Install deps
info "Installing dependencies..."
cd "$APP_DIR" && npm install --silent 2>/dev/null
ok "Done"

rm -rf "$EXTRACT_DIR"

echo ""
echo -e "${BOLD}${GREEN}✅  Update applied! Launch with: npm run dev${NC}"
echo ""
