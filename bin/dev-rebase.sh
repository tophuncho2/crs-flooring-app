#!/usr/bin/env bash
#
# dev-rebase — rebase the current dev-N branch onto origin/dev and force-push.
#
#   fetch origin → rebase origin/dev → push --force-with-lease origin <branch>
#
# The rebase-style sibling of dev-sync: keeps a dev-N branch's commits replayed
# linearly on top of the latest dev (no merge commit). NO check gauntlet — that
# runs later, from dev, via dev-rebase-finish.
#
# Scope: dev-N sub-branches ONLY (dev-1, dev-2, …). Refuses dev, staging, main.
#
# Aborts cleanly and pushes nothing on: wrong branch, dirty tree, fetch failure,
# or rebase conflict (the rebase is aborted and the branch restored).
#
# Caveat: --force-with-lease after a fetch is best-effort on a solo dev-N branch.
# It guards the common stale-overwrite, not a concurrent push to the same branch.
#
# Run from a dev-N worktree root:  bash bin/dev-rebase.sh   (or: npm run dev-rebase)

set -uo pipefail   # NOT -e: we control flow per step and abort explicitly

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

labels=()
results=()
notes=()

record() {
  labels+=("$1")
  results+=("$2")
  notes+=("$3")
}

print_summary() {
  printf "\n\033[1;36m═══ dev-rebase summary (%s) ═══\033[0m\n" "$branch"
  printf "%-12s | %-3s | %s\n" "Step" "" "Notes"
  printf "%-12s-+-%-3s-+-%s\n" "------------" "---" "------------------------------------"
  local i
  for i in "${!labels[@]}"; do
    printf "%-12s | %-3s | %s\n" "${labels[$i]}" "${results[$i]}" "${notes[$i]}"
  done
  printf "\n"
  if [ "$1" -eq 0 ]; then
    printf "\033[1;32mTL;DR: %s rebased onto origin/dev and force-pushed.\033[0m\n" "$branch"
  else
    printf "\033[1;31mTL;DR: dev-rebase aborted — nothing pushed (see ✗ row above).\033[0m\n"
  fi
}

# --- Step 1: branch guard (dev-N only) ---------------------------------------
header "branch guard"
branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" =~ ^dev-[0-9]+$ ]]; then
  ok "on '$branch' — eligible for rebase"
  record "guard" "✅" "branch: $branch"
else
  fail "dev-rebase runs on dev-N sub-branches (dev-1, dev-2, …) only. You are on '$branch'."
  echo "  dev/staging → use dev-sync;  main → use /promote." >&2
  record "guard" "❌" "'$branch' not eligible"
  print_summary 1
  exit 1
fi

# --- Step 2: clean-tree guard ------------------------------------------------
header "clean-tree guard"
if [ -z "$(git status --porcelain)" ]; then
  ok "working tree clean"
  record "clean" "✅" "no uncommitted changes"
else
  fail "working tree has uncommitted changes — commit or stash before rebasing."
  record "clean" "❌" "tree dirty"
  print_summary 1
  exit 1
fi

# --- Step 3: fetch -----------------------------------------------------------
header "fetch origin"
if git fetch origin; then
  ok "fetched origin"
  record "fetch" "✅" "origin refs refreshed"
else
  fail "git fetch origin failed — check your connection/remote."
  record "fetch" "❌" "fetch failed"
  print_summary 1
  exit 1
fi

# --- Step 4: rebase onto origin/dev ------------------------------------------
header "rebase origin/dev"
if git rebase origin/dev; then
  ok "rebased onto origin/dev"
  record "rebase" "✅" "replayed on latest dev"
else
  git rebase --abort
  fail "rebase conflict with origin/dev — resolve manually, then re-run. (rebase aborted; branch restored)"
  record "rebase" "❌" "conflict — rebase aborted"
  print_summary 1
  exit 1
fi

# --- Step 5: force-push ------------------------------------------------------
header "force-push"
if git push --force-with-lease origin "$branch"; then
  ok "force-pushed $branch"
  record "push" "✅" "origin/$branch rewritten"
else
  fail "git push --force-with-lease failed — origin/$branch may have moved; re-fetch and retry."
  record "push" "❌" "force-push failed"
  print_summary 1
  exit 1
fi

# --- Summary -----------------------------------------------------------------
print_summary 0
exit 0
