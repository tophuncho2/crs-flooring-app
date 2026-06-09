#!/usr/bin/env bash
#
# Seed a DB — branch-agnostic.
#
# Pure DB operation — no git refs, no branches, no merges. Discovers which
# target env files exist in this worktree, asks which one to seed against,
# confirms, then swaps .env to the chosen file, runs `npm run db:seed`, and
# restores .env to whatever it was before.
#
# The seed script (packages/db/scripts/seed.js) is upsert-based — safe to
# re-run. Use this when:
#   - bootstrapping a fresh DB
#   - backfilling new reference rows added to one of the seed scripts
#
# Targets are the .env.<name> files that actually exist here. dev-1/2/3 only
# have .env.dev; staging/main/dev have .env.dev, .env.staging, .env.main.
# Files that aren't present are never listed.
#
# Safety:
#   - set -euo pipefail: exit on any failure, no silent errors
#   - confirmation prompt before anything is touched
#   - trap: if seed fails, .env is restored to its prior contents
#
# Run from repo root:  bash bin/seed.sh
#
# shellcheck disable=SC2310

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn()   { printf "\033[1;33m! %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# Candidate targets, in display order. Only the ones whose .env.<name> file
# exists are offered — this naturally excludes .env, .env.example, etc.
CANDIDATES=(dev staging main)

names=()
files=()
for name in "${CANDIDATES[@]}"; do
  if [ -f ".env.$name" ]; then
    names+=("$name")
    files+=(".env.$name")
  fi
done

if [ "${#names[@]}" -eq 0 ]; then
  fail "no target env files found (looked for .env.{${CANDIDATES[*]// /,}})"
  exit 1
fi

# Selection menu
header "Which env should seed target?"
for i in "${!names[@]}"; do
  printf "  %d) %-8s (%s)\n" "$((i + 1))" "${names[$i]}" "${files[$i]}"
done

choice=""
while true; do
  printf "Select [1-%d] (q to quit): " "${#names[@]}"
  read -r choice
  case "$choice" in
    q|Q) ok "aborted, nothing changed"; exit 0 ;;
  esac
  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#names[@]}" ]; then
    break
  fi
  warn "invalid selection: $choice"
done

idx=$((choice - 1))
target_name="${names[$idx]}"
target_file="${files[$idx]}"

# Confirmation gate — nothing has been touched yet
header "About to run db:seed against the $target_name DB using $target_file."
printf "  This writes to that database. Continue? [y/N]: "
read -r confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) ok "aborted, nothing changed"; exit 0 ;;
esac

# Back up the current .env so we can restore it regardless of branch.
ENV_BACKUP=""
HAD_ENV=0
if [ -f .env ]; then
  HAD_ENV=1
  ENV_BACKUP="$(mktemp)"
  cp .env "$ENV_BACKUP"
fi

restore_env() {
  fail "seed failed — restoring .env"
  if [ "$HAD_ENV" -eq 1 ]; then
    cp "$ENV_BACKUP" .env
    ok ".env restored to its prior contents"
  else
    rm -f .env
    ok ".env removed (did not exist before)"
  fi
  [ -n "$ENV_BACKUP" ] && rm -f "$ENV_BACKUP"
}

# Swap .env to the chosen target (arm trap immediately after — anything from
# here on that fails should restore .env).
header "Switching .env to $target_file"
cp "$target_file" .env
trap restore_env ERR
diff -q .env "$target_file" >/dev/null
ok ".env now points at $target_name"

# Run seed against the chosen DB
header "Running db:seed against $target_name DB"
npm run db:seed
ok "seed complete"

# Restore .env to its prior state
header "Restoring .env"
if [ "$HAD_ENV" -eq 1 ]; then
  cp "$ENV_BACKUP" .env
  diff -q .env "$ENV_BACKUP" >/dev/null
  ok ".env restored to its prior contents"
else
  rm -f .env
  ok ".env removed (did not exist before)"
fi
[ -n "$ENV_BACKUP" ] && rm -f "$ENV_BACKUP"

# Clear the error trap — we made it through.
trap - ERR

printf "\n\033[1;32m═══ seed complete ═══\033[0m\n"
printf "%s DB seeded, .env restored.\n" "$target_name"
