#!/usr/bin/env bash
# Brings a local checkout up to date before working: sources, Docker services,
# dependencies, Prisma client and both databases (dev + e2e tests).
#
#   pnpm update:dev          # update everything
#   pnpm update:dev --dev    # ...then start `pnpm dev`
#   pnpm update:dev --no-pull
set -euo pipefail

cd "$(dirname "$0")/.."

pull=true
start_dev=false
for arg in "$@"; do
  case "$arg" in
    --no-pull) pull=false ;;
    --dev) start_dev=true ;;
    *) echo "Unknown option: $arg (use --no-pull, --dev)" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!   %s\033[0m\n' "$1"; }

step "Sources"
if ! $pull; then
  echo "Skipped (--no-pull)."
elif ! git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  warn "Branch $(git branch --show-current) has no upstream: nothing to pull."
elif [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes: pull skipped (commit or stash them first)."
else
  git pull --ff-only
fi

step "Docker services (MariaDB, Mailpit, S3, Adminer)"
docker compose -f docker/docker-compose.yml up -d --wait

step "Dependencies"
pnpm install

step "Prisma client"
pnpm --filter @tiralarc/api prisma:generate

step "Database migrations (tiralarc)"
# `migrate deploy`, not `migrate dev`: it applies committed migrations and never
# creates a new one or offers to reset the database.
pnpm --filter @tiralarc/api db:deploy

step "Database migrations (tiralarc_test)"
pnpm --filter @tiralarc/api exec dotenv run -q -f .env.test -- prisma migrate deploy

step "Environment files"
# Lists the variables of each .env.example missing from the matching local file.
check_env() {
  local example=$1 local_file=$2
  if [ ! -f "$local_file" ]; then
    warn "$local_file is missing: copy it from $example."
    return
  fi
  local missing
  missing=$(comm -23 \
    <(grep -oE '^[A-Z0-9_]+=' "$example" | sort -u) \
    <(grep -oE '^[A-Z0-9_]+=' "$local_file" | sort -u) | tr -d '=' | tr '\n' ' ')
  if [ -n "$missing" ]; then
    warn "$local_file lacks: $missing(see $example)"
  else
    echo "$local_file: OK"
  fi
}
check_env apps/api/.env.example apps/api/.env
check_env apps/web/.env.example apps/web/.env.local

step "Up to date"
if $start_dev; then
  exec pnpm dev
fi
echo "Start the project with: pnpm dev"
