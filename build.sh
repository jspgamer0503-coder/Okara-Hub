#!/bin/bash
# Neural Dock — Setup Script
# Run once after extracting: ./build.sh
# Then launch with: npm run dev

set -e
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${NC}"; }
info() { echo -e "${CYAN}➜   $*${NC}"; }
fail() { echo -e "${RED}❌  $*${NC}"; exit 1; }

echo ""
echo -e "${BOLD}⚡  Neural Dock — Setup${NC}"
echo ""

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
[ "$NODE_MAJOR" -lt 20 ] && fail "Node.js >= 20 required. Run: nvm install 20 && nvm use 20"
ok "Node $(node -v)"

info "Installing dependencies..."
npm install
ok "Dependencies ready"

echo ""
echo -e "${BOLD}${GREEN}✅  Setup complete!${NC}"
echo ""
echo "  Launch: npm run dev"
echo ""
