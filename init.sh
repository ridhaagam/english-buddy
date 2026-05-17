#!/usr/bin/env bash
set -e

# EnglishBuddy — one-shot setup
# Usage: ./init.sh

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}→ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
die()     { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo "  EnglishBuddy — local setup"
echo "  ─────────────────────────────────"
echo ""

# ── Requirements ──────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"

# Detect compose command (v2 plugin or legacy standalone)
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    die "Docker Compose not found. Install Docker Desktop (includes Compose)."
fi

# Check Docker daemon is running
docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker Desktop first."

success "Docker OK ($(docker --version | cut -d' ' -f3 | tr -d ','))"

# ── Build & start ─────────────────────────────────────────────────────────────
info "Building images and starting containers..."
$COMPOSE up -d --build

# ── Wait for API health ───────────────────────────────────────────────────────
info "Waiting for API to become healthy..."
MAX=60
COUNT=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX ]; then
        die "API did not become healthy after ${MAX}s. Run: docker compose logs api"
    fi
    sleep 1
done
success "API is healthy"

# ── Wait for frontend ─────────────────────────────────────────────────────────
info "Waiting for frontend..."
COUNT=0
until curl -sf http://localhost:5173 >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge 30 ]; then
        warn "Frontend not responding yet — it may still be starting."
        break
    fi
    sleep 1
done
success "Frontend is up"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  All done.${NC}"
echo ""
echo "  App:      http://localhost:5173"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  Default accounts:"
echo "    Owner   → agam@gmail.com   / agam123"
echo "    Learner → gery@gmail.com   / 123456"
echo ""

# Open browser (best-effort, not required)
URL="http://localhost:5173"
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v start >/dev/null 2>&1; then
    start "$URL"
fi
