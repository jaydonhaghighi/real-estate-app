#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

red()   { printf "\033[0;31m%s\033[0m\n" "$1"; }
green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
blue()  { printf "\033[0;34m%s\033[0m\n" "$1"; }

fail() { red "ERROR: $1"; exit 1; }

blue "=== Real Estate App Setup ==="

# ── Check prerequisites ──

blue "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Run: brew install node@22"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js 20+ required (found $(node -v))"

command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed. Run: npm install -g pnpm@9.12.0"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Download from https://docker.com/products/docker-desktop"

docker info >/dev/null 2>&1 || fail "Docker is not running. Open Docker Desktop and wait for it to start."

green "All prerequisites found."

# ── Stop local PostgreSQL if it conflicts ──

if lsof -i :5432 2>/dev/null | grep -q postgres && ! lsof -i :5432 2>/dev/null | grep -q docker; then
  blue "Stopping local PostgreSQL (conflicts with Docker)..."
  brew services stop postgresql@16 2>/dev/null || brew services stop postgresql 2>/dev/null || true
  sleep 2
fi

# ── Start Docker services ──

blue "Starting PostgreSQL and Redis via Docker..."
docker compose up -d

blue "Waiting for PostgreSQL to be ready (inside container)..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start in time"
  sleep 1
done

blue "Waiting for PostgreSQL to be reachable on host (localhost:5432)..."
for i in $(seq 1 30); do
  if (echo >/dev/tcp/localhost/5432) 2>/dev/null; then
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL is not reachable on localhost:5432. Port may be in use by another process. Try: docker compose down && lsof -i :5432"
  sleep 1
done
green "PostgreSQL is ready."

# ── Create .env if missing ──

if [ ! -f .env ]; then
  blue "Creating .env from template..."
  cp .env.example .env

  ENCRYPTION_KEY=$(openssl rand -base64 32)

  sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/messaging_mvp|" .env
  sed -i '' "s|LOCAL_ENCRYPTION_KEY_BASE64=.*|LOCAL_ENCRYPTION_KEY_BASE64=${ENCRYPTION_KEY}|" .env

  green ".env created and configured."
else
  green ".env already exists, skipping."
fi

# ── Install dependencies ──

blue "Installing dependencies..."
pnpm install

# ── Run migrations ──

blue "Running database migrations..."
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/messaging_mvp pnpm db:migrate

# ── Seed database ──

blue "Seeding database..."
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/messaging_mvp pnpm db:seed

# ── Create missing asset directories ──

mkdir -p apps/mobile/assets/images

# ── Done ──

green ""
green "=== Setup complete! ==="
green ""
green "Run 'pnpm dev' to start everything."
green ""
green "  API:        http://localhost:3001"
green "  API Docs:   http://localhost:3001/docs"
green "  Web Admin:  http://localhost:3002"
green "  Mobile:     iOS Simulator (auto-launches)"
green ""
