#!/usr/bin/env bash
#
# Seed the main DB.
#
# Pure DB operation — no git refs, no branches, no merges. Swaps .env to
# .env.main, runs `npm run db:seed`, then restores .env to .env.staging.
#
# The seed script (packages/db/scripts/seed.js) is upsert-based — safe to
# re-run. Use this when:
#   - bootstrapping a fresh main DB
#   - backfilling new reference rows added to one of the seed scripts
#
# Steps:
#   1. Swap .env to .env.main
#   2. Run npm run db:seed
#   3. Restore .env to .env.staging
#
# Safety:
#   - set -euo pipefail: exit on any failure, no silent errors
#   - trap: if seed fails, restore .env to staging so you are not left in
#     main-env limbo
#   - pre-flight check that both env files exist before swapping
#
# Run from repo root:  bash bin/seed-main.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

restore_env_to_staging() {
  fail "seed failed — restoring .env to staging"
  if [ -f .env.staging ]; then
    cp .env.staging .env
    ok ".env restored to staging"
  else
    fail ".env.staging not found — leaving .env as-is"
  fi
}

# Pre-flight: both env files must exist
if [ ! -f .env.main ]; then
  fail ".env.main not found"
  exit 1
fi
if [ ! -f .env.staging ]; then
  fail ".env.staging not found"
  exit 1
fi

# 1. Swap .env to main (arm trap immediately after — anything from here on
#    that fails should restore .env to staging)
header "Switching .env to .env.main"
cp .env.main .env
trap restore_env_to_staging ERR
diff -q .env .env.main >/dev/null
ok ".env now points at main"

# 2. Run seed against main DB
header "Running db:seed against main DB"
npm run db:seed
ok "seed complete"

# 3. Restore .env to staging
header "Restoring .env to .env.staging"
cp .env.staging .env
diff -q .env .env.staging >/dev/null
ok ".env now points at staging"

# Clear the error trap — we made it through.
trap - ERR

printf "\n\033[1;32m═══ seed-main complete ═══\033[0m\n"
printf "main DB seeded, .env restored to staging.\n"
