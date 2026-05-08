#!/usr/bin/env bash
#
# Promote staging → main.
#
# Run this AFTER /promote has reported SAFE (or SAFE WITH WARNINGS that you
# have reviewed). The skill audits; this script executes.
#
# Steps:
#   1. Fetch origin
#   2. Checkout main, fast-forward pull
#   3. Fast-forward merge staging into main
#   4. Swap .env to .env.main
#   5. Apply any pending Prisma migrations to main DB (no-op if none)
#   6. Push main to origin (Railway auto-deploys)
#   7. Return to staging branch, restore .env to .env.staging
#
# Safety:
#   - set -euo pipefail: exit on any failure, no silent errors
#   - trap: if anything fails after the .env swap, restore .env to staging
#   - no force pushes, no resets, no migrate:dev
#
# Run from repo root:  bash bin/promote.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# If anything below the .env swap fails, restore .env to staging so the user
# is not left in main-env limbo. The trap is set immediately before the swap
# and cleared on success at the very end.
restore_env_to_staging() {
  fail "promote failed — restoring .env to staging"
  if [ -f .env.staging ]; then
    cp .env.staging .env
    ok ".env restored to staging"
  else
    fail ".env.staging not found — leaving .env as-is"
  fi
}

# 1. Fetch
header "Fetching latest refs from origin"
git fetch origin
ok "fetch complete"

# 2. Checkout main + pull
header "Switching to main and fast-forward pulling"
git checkout main
git pull --ff-only origin main
ok "main is up to date with origin"

# 3. Fast-forward merge staging
header "Fast-forward merging staging into main"
git merge --ff-only staging
ok "main fast-forwarded to staging"

# 4. Swap .env to main (arm trap immediately after — anything from here on
#    that fails should restore .env to staging)
header "Switching .env to .env.main"
cp .env.main .env
trap restore_env_to_staging ERR
diff -q .env .env.main >/dev/null
ok ".env now points at main"

# 5. Apply migrations (no-op if nothing pending)
header "Applying pending migrations to main DB (no-op if none)"
npm run db:deploy
ok "migrations up to date on main"

# 6. Push
header "Pushing main to origin"
git push origin main
ok "main pushed — Railway will redeploy"

# 7. Return to staging branch + env
header "Returning to staging branch"
git checkout staging
ok "on staging"

header "Restoring .env to .env.staging"
cp .env.staging .env
diff -q .env .env.staging >/dev/null
ok ".env now points at staging"

# Clear the error trap — we made it through.
trap - ERR

printf "\n\033[1;32m═══ promote complete ═══\033[0m\n"
printf "main is pushed, migrations applied, you are back on staging.\n"
