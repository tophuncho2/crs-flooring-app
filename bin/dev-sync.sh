#!/usr/bin/env bash
#
# Cross-worktree sync — the /sync skill as a script.
#
# Brings the current worktree up to dev and verifies it, in one pass:
#   fetch origin → merge origin/dev → bin/check.sh → push.
#
# Order matters: check runs BEFORE push, so a broken merge never reaches
# origin. A failed check leaves the merge committed locally but unpushed —
# recoverable, not lost (fix and re-run, or reset --hard origin/<branch>).
#
# Scope: only the dev-N sub-branches (dev-1, dev-2, …) and staging. dev → staging
# is a clean fast-forward ~99% of the time. dev itself (push directly) and main
# (use /promote) are refused by the branch guard.
#
# Aborts cleanly and pushes nothing on: wrong branch, dirty tree, fetch failure,
# merge conflict, or failing checks.
#
# Run from a worktree root:  bash bin/sync.sh   (or: npm run sync)

set -uo pipefail   # NOT -e: we control flow per step and abort explicitly

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# Parallel arrays: step label, result glyph, note.
labels=()
results=()
notes=()

record() {
  labels+=("$1")
  results+=("$2")
  notes+=("$3")
}

# print_summary <tldr-ok> — render the summary table and TL;DR line.
print_summary() {
  printf "\n\033[1;36m═══ sync summary (%s) ═══\033[0m\n" "$branch"
  printf "%-12s | %-3s | %s\n" "Step" "" "Notes"
  printf "%-12s-+-%-3s-+-%s\n" "------------" "---" "------------------------------------"
  local i
  for i in "${!labels[@]}"; do
    printf "%-12s | %-3s | %s\n" "${labels[$i]}" "${results[$i]}" "${notes[$i]}"
  done
  printf "\n"
  if [ "$1" -eq 0 ]; then
    printf "\033[1;32mTL;DR: synced — %s is up to date with origin/dev and pushed.\033[0m\n" "$branch"
  else
    printf "\033[1;31mTL;DR: sync aborted — nothing pushed (see ✗ row above).\033[0m\n"
  fi
}

# --- Step 1: branch guard ----------------------------------------------------
header "branch guard"
branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "staging" || "$branch" =~ ^dev-[0-9]+$ ]]; then
  ok "on '$branch' — eligible for sync"
  record "guard" "✅" "branch: $branch"
else
  fail "sync runs on dev-N sub-branches (dev-1, dev-2, …) and staging only. You are on '$branch'."
  echo "  dev → push directly;  main → use /promote." >&2
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
  fail "working tree has uncommitted changes — commit or stash before sync."
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

# --- Step 4: merge origin/dev ------------------------------------------------
header "merge origin/dev"
if git merge --no-edit origin/dev; then
  ok "merged origin/dev"
  record "merge" "✅" "current branch caught up to dev"
else
  git merge --abort
  fail "merge conflict with origin/dev — resolve manually, then re-run. (merge aborted; tree restored)"
  record "merge" "❌" "conflict — merge aborted"
  print_summary 1
  exit 1
fi

# --- Step 5: check -----------------------------------------------------------
header "check (bin/check.sh)"
if bash bin/check.sh; then
  ok "checks passed"
  record "check" "✅" "build + typecheck + lint + test"
else
  fail "checks failed — NOT pushing."
  echo "  The merge is committed locally but unpushed; fix and re-run," >&2
  echo "  or 'git reset --hard origin/$branch' to unwind the merge." >&2
  record "check" "❌" "gauntlet failed — not pushed"
  print_summary 1
  exit 1
fi

# --- Step 6: push ------------------------------------------------------------
header "push"
if git push; then
  ok "pushed $branch"
  record "push" "✅" "origin/$branch advanced"
else
  fail "git push failed — resolve and push manually."
  record "push" "❌" "push failed"
  print_summary 1
  exit 1
fi

# --- Summary -----------------------------------------------------------------
print_summary 0
exit 0
