#!/usr/bin/env bash
set -e

# EnglishBuddy — one-shot local setup
# Usage: ./init.sh
#
# What this script does:
#   1. Checks Docker is installed and running
#   2. Builds images and starts all containers
#   3. Waits for the API to become healthy
#   4. Runs database migrations (alembic upgrade head)
#   5. Seeds demo accounts and content (skips if already seeded)
#   6. Waits for the frontend dev server
#   7. Opens the app in your browser

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}→ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
die()     { echo -e "${RED}✗ $1${NC}"; exit 1; }
step()    { echo -e "\n${BOLD}$1${NC}"; }

echo ""
echo -e "${BOLD}  EnglishBuddy — local setup${NC}"
echo "  ─────────────────────────────────────"
echo ""

# ── 1. Check requirements ─────────────────────────────────────────────────────
step "[1/6] Checking requirements"

command -v docker >/dev/null 2>&1 \
  || die "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"

# Detect compose command (v2 plugin preferred, legacy standalone as fallback)
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    die "Docker Compose not found. Install Docker Desktop (includes Compose v2)."
fi

docker info >/dev/null 2>&1 \
  || die "Docker daemon is not running. Start Docker Desktop first, then re-run this script."

success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) — Compose available"

# ── 2. Build and start all containers ─────────────────────────────────────────
step "[2/6] Building images and starting containers"
info "This may take a few minutes on first run (pulling base images)..."
$COMPOSE up -d --build
success "Containers started"

# ── 3. Wait for API health ────────────────────────────────────────────────────
step "[3/6] Waiting for API"
info "Polling http://localhost:8000/health ..."
MAX=90
COUNT=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX ]; then
        echo ""
        die "API did not become healthy after ${MAX}s.\nRun: docker compose logs api"
    fi
    printf "."
    sleep 1
done
echo ""
success "API is healthy"

# ── 4. Run database migrations ────────────────────────────────────────────────
step "[4/6] Running database migrations"
info "Applying all pending Alembic migrations..."
$COMPOSE exec -T api alembic upgrade head \
  && success "Migrations up to date" \
  || die "Migration failed. Run: docker compose logs api"

# ── 5. Seed demo data ─────────────────────────────────────────────────────────
step "[5/6] Seeding demo data"
info "Creating demo accounts and sample content (skips if already done)..."
$COMPOSE exec -T api python seed.py \
  && success "Seed complete" \
  || die "Seed script failed. Run: docker compose logs api"

# ── 6. Wait for frontend ──────────────────────────────────────────────────────
step "[6/6] Waiting for frontend"
info "Polling http://localhost:5173 ..."
COUNT=0
until curl -sf http://localhost:5173 >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge 60 ]; then
        warn "Frontend not responding yet — Vite may still be compiling. Try http://localhost:5173 in a moment."
        break
    fi
    printf "."
    sleep 1
done
echo ""
if curl -sf http://localhost:5173 >/dev/null 2>&1; then
    success "Frontend is up"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ✓ All done! EnglishBuddy is ready.${NC}"
echo ""
echo "  App        →  http://localhost:5173"
echo "  API docs   →  http://localhost:8000/docs"
echo ""
echo -e "  ${BOLD}Default accounts:${NC}"
echo "    Admin    →  admin@example.com   /  admin123"
echo "    Student  →  student@example.com /  student123"
echo ""
echo "  To stop:   docker compose down"
echo "  To reset:  docker compose down -v && ./init.sh"
echo ""

# ── Open browser (best-effort) ────────────────────────────────────────────────
URL="http://localhost:5173"
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v start >/dev/null 2>&1; then
    start "$URL"
fi
