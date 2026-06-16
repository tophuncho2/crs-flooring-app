#!/usr/bin/env bash
#
# dev-rebase-finish — integrate a rebased dev-N branch back into dev.
#
#   fetch origin → merge origin/<dev-N> → bin/check.sh → push
#
# The integrate half of the rebase pair: after `dev-rebase` replays a dev-N
# branch onto origin/dev and force-pushes it, run this from the dev worktree to
# fold that branch's work into dev — verified before it is pushed.
#
# Scope: runs from the dev branch ONLY. Requires the target dev-N branch as an
# argument (e.g. dev-2).
#
# Order matters: check runs BEFORE push, so a broken integration never reaches
# origin. A failed check leaves the merge committed locally but unpushed —
# recoverable (fix and re-run, or reset --hard origin/dev).
#
# Aborts cleanly and pushes nothing on: bad/missing arg, wrong branch, dirty
# tree, fetch failure, missing target, merge conflict, or failing checks.
#
# Run from the dev worktree root:
#   bash bin/dev-rebase-finish.sh dev-2     (or: npm run dev-rebase-finish dev-2)

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
  printf "\n\033[1;36m═══ dev-rebase-finish summary (dev ← %s) ═══\033[0m\n" "$target"
  printf "%-12s | %-3s | %s\n" "Step" "" "Notes"
  printf "%-12s-+-%-3s-+-%s\n" "------------" "---" "------------------------------------"
  local i
  for i in "${!labels[@]}"; do
    printf "%-12s | %-3s | %s\n" "${labels[$i]}" "${results[$i]}" "${notes[$i]}"
  done
  printf "\n"
  if [ "$1" -eq 0 ]; then
    printf "\033[1;32mTL;DR: integrated %s into dev — checked and pushed.\033[0m\n" "$target"
  else
    printf "\033[1;31mTL;DR: dev-rebase-finish aborted — nothing pushed (see ✗ row above).\033[0m\n"
  fi
}

# --- Step 0: arg guard -------------------------------------------------------
# (Validate the arg before anything else; $target is also used by print_summary.)
target="${1:-}"
header "arg guard"
if [ -z "$target" ]; then
  fail "missing target branch."
  echo "  usage: bash bin/dev-rebase-finish.sh <dev-N>   (e.g. dev-2)" >&2
  target="<none>"
  record "arg" "❌" "no target given"
  print_summary 1
  exit 2
fi
if [[ ! "$target" =~ ^dev-[0-9]+$ ]]; then
  fail "'$target' is not a dev-N branch (dev-1, dev-2, …)."
  echo "  usage: bash bin/dev-rebase-finish.sh <dev-N>   (e.g. dev-2)" >&2
  record "arg" "❌" "invalid target '$target'"
  print_summary 1
  exit 2
fi
ok "target: $target"
record "arg" "✅" "target: $target"

# --- Step 1: branch guard (dev only) -----------------------------------------
header "branch guard"
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "dev" ]; then
  ok "on dev — eligible to integrate"
  record "guard" "✅" "branch: dev"
else
  fail "dev-rebase-finish runs from the dev branch only. You are on '$branch'."
  record "guard" "❌" "'$branch' is not dev"
  print_summary 1
  exit 1
fi

# --- Step 2: clean-tree guard ------------------------------------------------
header "clean-tree guard"
if [ -z "$(git status --porcelain)" ]; then
  ok "working tree clean"
  record "clean" "✅" "no uncommitted changes"
else
  fail "working tree has uncommitted changes — commit or stash before integrating."
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

# --- Step 4: target exists ---------------------------------------------------
header "target exists"
if git rev-parse --verify --quiet "origin/$target" >/dev/null; then
  ok "origin/$target found"
  record "target" "✅" "origin/$target"
else
  fail "origin/$target not found — push it first (run dev-rebase on $target)."
  record "target" "❌" "origin/$target missing"
  print_summary 1
  exit 1
fi

# --- Step 5: merge origin/<target> -------------------------------------------
header "merge origin/$target"
if git merge --no-edit "origin/$target"; then
  ok "merged origin/$target"
  record "merge" "✅" "dev now carries $target"
else
  git merge --abort
  fail "merge conflict integrating origin/$target — resolve manually, then re-run. (merge aborted)"
  record "merge" "❌" "conflict — merge aborted"
  print_summary 1
  exit 1
fi

# --- Step 6: check -----------------------------------------------------------
header "check (bin/check.sh)"
if bash bin/check.sh; then
  ok "checks passed"
  record "check" "✅" "build + typecheck + lint + test"
else
  fail "checks failed — NOT pushing."
  echo "  The merge is committed locally but unpushed; fix and re-run," >&2
  echo "  or 'git reset --hard origin/dev' to unwind the integration." >&2
  record "check" "❌" "gauntlet failed — not pushed"
  print_summary 1
  exit 1
fi

# --- Step 7: push ------------------------------------------------------------
header "push"
if git push; then
  ok "pushed dev"
  record "push" "✅" "origin/dev advanced"
else
  fail "git push failed — resolve and push manually."
  record "push" "❌" "push failed"
  print_summary 1
  exit 1
fi

# --- Summary -----------------------------------------------------------------
print_summary 0
exit 0
