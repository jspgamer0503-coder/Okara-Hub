#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  Okara Hub — .deb Builder
#  Run from the project root: bash build-deb.sh
# ─────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[info]${NC} $*"; }
success() { echo -e "${GREEN}[done]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
error()   { echo -e "${RED}[error]${NC} $*"; exit 1; }

echo ""
echo -e "${CYAN}  ██████╗ ██╗  ██╗ █████╗ ██████╗  █████╗ ${NC}"
echo -e "${CYAN} ██╔═══██╗██║ ██╔╝██╔══██╗██╔══██╗██╔══██╗${NC}"
echo -e "${CYAN} ██║   ██║█████╔╝ ███████║██████╔╝███████║${NC}"
echo -e "${CYAN} ██║   ██║██╔═██╗ ██╔══██║██╔══██╗██╔══██║${NC}"
echo -e "${CYAN} ╚██████╔╝██║  ██╗██║  ██║██║  ██║██║  ██║${NC}"
echo -e "${CYAN}  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝${NC}"
echo -e "${CYAN}              .deb Package Builder${NC}"
echo ""

# ── 1. Node version check ────────────────────────────────────────
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 18+ required. Run: nvm install 20 && nvm use 20"
fi
info "Node.js $(node -v) ✓"

# ── 2. Install dependencies ──────────────────────────────────────
info "Installing dependencies..."
npm install --prefer-offline 2>/dev/null || npm install
success "Dependencies ready"

# ── 3. Clean previous builds ─────────────────────────────────────
info "Cleaning previous builds..."
rm -rf dist dist-electron
success "Clean"

# ── 4. Build Vite (React frontend) ──────────────────────────────
info "Building React frontend..."
npx vite build
success "Frontend built → dist/"

# ── 5. Build .deb with electron-builder ──────────────────────────
info "Building .deb package (this takes ~1-2 minutes)..."
npx electron-builder --linux deb --x64
success "Build complete!"

# ── 6. Show output ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
DEB=$(find dist-electron -name "*.deb" | head -1)
if [ -n "$DEB" ]; then
  SIZE=$(du -sh "$DEB" | cut -f1)
  echo -e "${GREEN}  📦  Package: ${NC}$DEB"
  echo -e "${GREEN}  📏  Size:    ${NC}$SIZE"
  echo ""
  echo -e "${CYAN}  Install:${NC}  sudo dpkg -i $DEB"
  echo -e "${CYAN}  Launch:${NC}   okara-hub"
  echo -e "${CYAN}  Remove:${NC}   sudo apt remove okara-hub"
  echo -e "${CYAN}  Purge:${NC}    sudo apt purge okara-hub   (also removes config)"
else
  warn "No .deb found in dist-electron/ — check output above for errors"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
