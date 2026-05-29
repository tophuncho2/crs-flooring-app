#!/usr/bin/env bash
#
# diffmainstaging — read-only sync check for staging vs main.
#
# Answers one question without having to ask anyone: are staging and main
# (branches + databases) in sync?
#
# Checks:
#   1. Fetch origin
#   2. staging vs main (local)            — should be 0/0
#   3. staging vs origin/staging          — should be 0/0
#   4. main vs origin/main                — should be 0/0
#   5. Working tree clean
#   6. Prisma migrate status — staging DB (.env.staging)
#   7. Prisma migrate status — main DB   (.env.main)
#
# Read-only and safe:
#   - never swaps .env, never deploys/applies migrations, never pushes/merges
#   - DB checks run `prisma migrate status` against a DATABASE_URL pulled from
#     the env files, exported inline (the live .env is left untouched)
#
# Exit code 0 when everything is in sync, 1 otherwise.
#
# Run from anywhere:  bash bin/diffmainstaging.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn()   { printf "\033[1;33m! %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

PROBLEMS=0
note_problem() { PROBLEMS=$((PROBLEMS + 1)); }

# Pull DATABASE_URL out of an env file without sourcing it (avoids executing
# arbitrary content). Strips an optional surrounding pair of quotes.
read_database_url() {
  local file="$1"
  [ -f "$file" ] || { echo ""; return; }
  local line
  line="$(grep -E '^DATABASE_URL=' "$file" | tail -1)"
  line="${line#DATABASE_URL=}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

# Compare two refs by ahead/behind count. Args: <left> <right> <label>
compare_refs() {
  local left="$1" right="$2" label="$3"
  if ! git rev-parse --verify --quiet "$left" >/dev/null || \
     ! git rev-parse --verify --quiet "$right" >/dev/null; then
    warn "$label — ref missing ($left or $right), skipped"
    note_problem
    return
  fi
  local counts ahead behind
  counts="$(git rev-list --left-right --count "$left...$right")"
  ahead="$(printf '%s' "$counts" | awk '{print $1}')"
  behind="$(printf '%s' "$counts" | awk '{print $2}')"
  if [ "$ahead" = "0" ] && [ "$behind" = "0" ]; then
    ok "$label — in sync (0/0)"
  else
    fail "$label — out of sync ($ahead ahead / $behind behind)"
    note_problem
  fi
}

# Run `prisma migrate status` against a given env file's DATABASE_URL.
check_db() {
  local label="$1" env_file="$2"
  local url
  url="$(read_database_url "$env_file")"
  if [ -z "$url" ]; then
    warn "$label DB — no DATABASE_URL in $env_file, skipped"
    note_problem
    return
  fi
  local out
  out="$(cd packages/db && DATABASE_URL="$url" npx prisma migrate status 2>&1)"
  if printf '%s' "$out" | grep -q "Database schema is up to date"; then
    ok "$label DB — migrations up to date"
  else
    fail "$label DB — NOT up to date"
    printf '%s\n' "$out" | grep -Ei 'pending|not yet|failed|drift|following migration' | sed 's/^/    /'
    note_problem
  fi
}

# 1. Fetch
header "Fetching latest refs from origin"
if git fetch origin --quiet 2>/dev/null; then
  ok "fetch complete"
else
  warn "fetch failed (offline?) — comparisons use last-known remote refs"
fi

# 2-4. Branch comparisons
header "Comparing branches"
compare_refs staging main          "staging vs main (local)"
compare_refs staging origin/staging "staging vs origin/staging"
compare_refs main origin/main      "main vs origin/main"

# 5. Working tree
header "Working tree"
if [ -z "$(git status --porcelain)" ]; then
  ok "clean"
else
  warn "uncommitted changes present"
  note_problem
fi

# 6-7. Databases
header "Database migration status"
check_db staging .env.staging
check_db main    .env.main

# Summary
if [ "$PROBLEMS" -eq 0 ]; then
  printf "\n\033[1;32m═══ in sync — staging, main, and both DBs are aligned ═══\033[0m\n"
  exit 0
else
  printf "\n\033[1;31m═══ %s issue(s) found — see above ═══\033[0m\n" "$PROBLEMS"
  exit 1
fi
