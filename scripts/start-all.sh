#!/bin/bash

# ══════════════════════════════════════════════
# 🚀 KnotEngine — Start All Services
# Starts Docker infrastructure + Apps with hot-reload
# ══════════════════════════════════════════════

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Starting KnotEngine...${NC}"
echo ""

# ── Start Docker Infrastructure ──
bash "$(dirname "$0")/docker-up.sh"

if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Failed to start Docker services. Exiting.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}▶ Starting Apps with hot-reload...${NC}"
echo -e "${CYAN}   Press Ctrl+C to stop apps${NC}"
echo ""

# ── Start Apps ──
pnpm dev
