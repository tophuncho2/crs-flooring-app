#!/usr/bin/env bash
#
# Local verification gauntlet — the /check skill as a script.
#
# Cleans build caches, then runs build → typecheck → lint → test. Runs ALL
# steps even if an earlier one fails (full picture in one pass), then prints a
# PASS/FAIL summary table. Exits non-zero if any gating step failed.
#
# Build runs FIRST: @builders/web|relay|worker resolve the shared packages
# (@builders/domain, @builders/db, …) to their compiled dist/, and the build
# regenerates those dists + the Prisma client. Running typecheck/test against a
# stale dist/ would show phantom "not exported" failures, so build goes first.
#
# Notes on gates:
#   - lint passes with warnings; the gate is eslint's own exit code (0 errors).
#   - test runs workspaces sequentially and aborts at the first failing one, so
#     a later workspace may be untested when an earlier one fails.
#
# Run from repo root:  bash bin/check.sh

set -uo pipefail   # NOT -e: we want every step to run even if one fails

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()     { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()   { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

LOG_DIR="$(mktemp -d)"
trap 'rm -rf "$LOG_DIR"' EXIT

# Parallel arrays: step label, result glyph, note.
labels=()
results=()
notes=()

record() {
  labels+=("$1")
  results+=("$2")
  notes+=("$3")
}

# run <label> <logfile> <command...> — runs the command, streams output live,
# captures it for note extraction, and records pass/fail. Returns the rc.
run_step() {
  local label="$1" log="$2"; shift 2
  header "$label"
  "$@" 2>&1 | tee "$log"
  return "${PIPESTATUS[0]}"
}

# --- Step 1: clean -----------------------------------------------------------
header "clean"
if rm -rf apps/web/.next apps/web/tsconfig.tsbuildinfo; then
  ok "caches removed"
  record "clean" "✅" "caches removed"
else
  fail "clean failed"
  record "clean" "❌" "rm failed"
fi

# --- Step 2: build -----------------------------------------------------------
if run_step "build" "$LOG_DIR/build.log" npm run build; then
  ok "build passed"
  record "build" "✅" "web + relay + worker"
else
  fail "build failed"
  record "build" "❌" "see output above — later steps may reflect stale dist/"
fi

# --- Step 3: typecheck -------------------------------------------------------
if run_step "typecheck" "$LOG_DIR/typecheck.log" npm run typecheck; then
  ok "typecheck passed"
  record "typecheck" "✅" "all packages"
else
  tc_errs="$(grep -cE 'error TS' "$LOG_DIR/typecheck.log" 2>/dev/null || echo "?")"
  fail "typecheck failed"
  record "typecheck" "❌" "$tc_errs TS error(s)"
fi

# --- Step 4: lint ------------------------------------------------------------
if run_step "lint" "$LOG_DIR/lint.log" npm run lint; then
  warns="$(grep -ciE 'warning' "$LOG_DIR/lint.log" 2>/dev/null || echo 0)"
  ok "lint passed"
  record "lint" "✅" "0 errors, $warns warning line(s)"
else
  fail "lint failed"
  record "lint" "❌" "eslint reported errors"
fi

# --- Step 5: test ------------------------------------------------------------
if run_step "test" "$LOG_DIR/test.log" npm run test; then
  ok "test passed"
  record "test" "✅" "all workspaces"
else
  fail "test failed"
  record "test" "❌" "a workspace failed — later workspaces may be skipped"
fi

# --- Summary -----------------------------------------------------------------
printf "\n\033[1;36m═══ check summary ═══\033[0m\n"
printf "%-12s | %-3s | %s\n" "Step" "" "Notes"
printf "%-12s-+-%-3s-+-%s\n" "------------" "---" "------------------------------------"
overall=0
for i in "${!labels[@]}"; do
  printf "%-12s | %-3s | %s\n" "${labels[$i]}" "${results[$i]}" "${notes[$i]}"
  [ "${results[$i]}" = "❌" ] && overall=1
done

printf "\n"
if [ "$overall" -eq 0 ]; then
  printf "\033[1;32mTL;DR: all checks passed.\033[0m\n"
else
  printf "\033[1;31mTL;DR: one or more checks failed (see ❌ rows above).\033[0m\n"
fi

exit "$overall"
