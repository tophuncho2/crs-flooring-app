#!/usr/bin/env bash
#
# Scale board — read-only production volume snapshot.
#
# The companion to `bin/pulse.sh`. Where pulse answers "is prod HEALTHY?", scale
# answers "how BIG is prod?" — row counts per key table + the user roster. Every
# command here is STRICTLY read-only (SELECT count only) — no deploys, no
# migrations, no writes — so it can never hurt the running system.
#
# Scope: §1 Core records · §2 Management · §3 Imports pipeline ·
#        §4 Users (per-rank). All four read the prod DB directly (read-only counts).
#
# Creds: prod-only, read live from the main worktree's .env (single source of
# truth — no per-branch copies): DATABASE_URL. Override the env file with:
#        SCALE_ENV=/path/to/.env bash bin/scale.sh
#
# Run from anywhere:  bash bin/scale.sh   (or `npm run scale`)

set -uo pipefail   # NOT -e: one failing read must not abort the whole board

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── config ──────────────────────────────────────────────────────────────────
PROD_ENV="main"          # environment whose .env holds the prod DATABASE_URL

# ── presentation ──────────────────────────────────────────────────────────────
# Mirrors bin/pulse.sh: a colored glyph + fixed-width label + value at a
# consistent gutter (left-aligned, close to the label — NOT floated far right).
header()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
# Main metric — blue dot (volume, not health) + bold label, then the count.
row()     { printf "  \033[1;34m🔵 %-20s\033[0m %s\n" "$1" "$(commafy "${2:-0}")"; }
# Sub-detail — dim bullet, aligned to the same value column as the rows above.
sub()     { printf "  \033[2m•  %-20s %s\033[0m\n" "$1" "$(commafy "${2:-0}")"; }
note()    { printf "  \033[2m•  %s\033[0m\n" "$*"; }

# Group a bare integer with thousands separators (12431 → 12,431). Pure awk —
# no python/locale dependency, and portable across BSD (macOS) + GNU. BSD sed
# rejects ';'-separated labels, so awk is the safe choice here.
commafy() { awk -v n="${1:-0}" 'BEGIN{x=n; s=""; while(length(x)>3){s=","substr(x,length(x)-2)s; x=substr(x,1,length(x)-3)} print x s}'; }

# Coerce to a non-negative integer (0 if empty/non-numeric) so arithmetic is safe.
intval() { case "${1:-}" in ''|*[!0-9]*) echo 0;; *) echo "$1";; esac; }

# Portable bounded-run: prefer coreutils timeout/gtimeout, else run bare (the
# single psql round-trip returns fast against a reachable DB).
TIMEOUT=""
command -v timeout  >/dev/null 2>&1 && TIMEOUT="timeout 25"
command -v gtimeout >/dev/null 2>&1 && TIMEOUT="gtimeout 25"

# ── helpers ───────────────────────────────────────────────────────────────────
# Path of the `main` worktree (handles spaces in the repo path via substr).
resolve_main_worktree() {
  git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null \
    | awk '/^worktree /{p=substr($0,10)} /^branch refs\/heads\/main$/{print p; exit}'
}

# Read one KEY from an env FILE without sourcing it (avoids clobbering the shell).
read_env_key() { # <file> <key>
  [ -f "$1" ] || { echo ""; return; }
  grep -E "^$2=" "$1" | head -1 | sed -E "s/^$2=//; s/^\"//; s/\"$//; s/^'//; s/'$//"
}

MAIN_WT="$(resolve_main_worktree)"
PROD_ENV_FILE="${SCALE_ENV:-${MAIN_WT:+$MAIN_WT/.env}}"

printf "\033[1m╭─ Scale board · prod (%s) · %s\033[0m\n" "$PROD_ENV" "$(date '+%a %b %d  %H:%M %Z')"
printf "\033[2m╰─ read-only · env-file: %s\033[0m\n" "${PROD_ENV_FILE:-<none found>}"

# ── one psql round-trip for every count ───────────────────────────────────────
# Non-@@map models (User/Session/UserInvite) keep Prisma's default quoted
# PascalCase table names, so they MUST be double-quoted in raw SQL.
DBURL="$(read_env_key "$PROD_ENV_FILE" DATABASE_URL)"
DB_OK=0; METRICS=""
if command -v psql >/dev/null 2>&1 && [ -n "$DBURL" ]; then
  METRICS="$($TIMEOUT psql "$DBURL" -v ON_ERROR_STOP=1 -X -At -F'|' -c "
    SELECT 'inventory',    count(*) FROM flooring_inventory
    UNION ALL SELECT 'adjustment',   count(*) FROM flooring_inventory_adjustment
    UNION ALL SELECT 'work_order',    count(*) FROM flooring_work_order
    UNION ALL SELECT 'wo_item',       count(*) FROM flooring_work_order_item
    UNION ALL SELECT 'template',      count(*) FROM template
    UNION ALL SELECT 'payment',       count(*) FROM flooring_payment
    UNION ALL SELECT 'product',       count(*) FROM flooring_product
    UNION ALL SELECT 'entity',        count(*) FROM entity
    UNION ALL SELECT 'property',      count(*) FROM property_hub
    UNION ALL SELECT 'warehouse',     count(*) FROM flooring_warehouse
    UNION ALL SELECT 'category',      count(*) FROM flooring_category
    UNION ALL SELECT 'unit',          count(*) FROM flooring_unit_of_measure
    UNION ALL SELECT 'job_type',      count(*) FROM flooring_job_type
    UNION ALL SELECT 'entity_type',   count(*) FROM flooring_entity_type
    UNION ALL SELECT 'import_entry',  count(*) FROM flooring_import_entry
    UNION ALL SELECT 'staged_total',  count(*) FROM flooring_import_staged_inventory_row
    UNION ALL SELECT 'staged_draft',  count(*) FROM flooring_import_staged_inventory_row WHERE status='DRAFT'
    UNION ALL SELECT 'staged_queued', count(*) FROM flooring_import_staged_inventory_row WHERE status='QUEUED'
    UNION ALL SELECT 'staged_imported',count(*) FROM flooring_import_staged_inventory_row WHERE status='IMPORTED'
    UNION ALL SELECT 'filter_row',    count(*) FROM flooring_import_staged_inventory_filter_row
    UNION ALL SELECT 'user_total',    count(*) FROM \"User\"
    UNION ALL SELECT 'user_dev',      count(*) FROM \"User\" WHERE rank='DEVELOPER'
    UNION ALL SELECT 'user_t1',       count(*) FROM \"User\" WHERE rank='TIER_1'
    UNION ALL SELECT 'user_t2',       count(*) FROM \"User\" WHERE rank='TIER_2'
    UNION ALL SELECT 'user_t3',       count(*) FROM \"User\" WHERE rank='TIER_3';
  " 2>/dev/null)"
  [ -n "$METRICS" ] && DB_OK=1
fi
# Pull one labeled metric out of the shared blob (0 if absent).
m() { intval "$(echo "$METRICS" | awk -F'|' -v k="$1" '$1==k{print $2; exit}')"; }

# ── guard: reachability ───────────────────────────────────────────────────────
if [ "$DB_OK" -ne 1 ]; then
  header "Scale unavailable"
  if ! command -v psql >/dev/null 2>&1; then
    note "psql not installed — cannot read prod DB."
  elif [ -z "$DBURL" ]; then
    note "no DATABASE_URL in ${PROD_ENV_FILE:-<none>} — nothing to read."
  else
    note "prod DB unreachable (query failed) — check the connection / token."
  fi
  echo
  exit 1
fi

# ── §1 Core records ───────────────────────────────────────────────────────────
header "§1  Core records"
row "Inventory"        "$(m inventory)"
row "Adjustments"      "$(m adjustment)"
row "Payments"         "$(m payment)"

# ── §2 Management ─────────────────────────────────────────────────────────────
header "§2  Management"
row "Work orders"      "$(m work_order)"
sub "WO items"         "$(m wo_item)"
row "Templates"        "$(m template)"
row "Products"         "$(m product)"
row "Entities"         "$(m entity)"
row "Properties"       "$(m property)"
row "Warehouses"       "$(m warehouse)"
sub "categories"       "$(m category)"
sub "units"            "$(m unit)"
sub "job types"        "$(m job_type)"
sub "entity types"     "$(m entity_type)"

# ── §3 Imports pipeline ───────────────────────────────────────────────────────
header "§3  Imports pipeline"
row "Import entries"   "$(m import_entry)"
row "Filter rows"      "$(m filter_row)"
row "Staged rows"      "$(m staged_total)"
sub "DRAFT"            "$(m staged_draft)"
sub "QUEUED"           "$(m staged_queued)"
sub "IMPORTED"         "$(m staged_imported)"

# ── §4 Users ──────────────────────────────────────────────────────────────────
header "§4  Users"
row "Users"            "$(m user_total)"
sub "DEVELOPER"        "$(m user_dev)"
sub "TIER_1"           "$(m user_t1)"
sub "TIER_2"           "$(m user_t2)"
sub "TIER_3"           "$(m user_t3)"

# ── TL;DR ─────────────────────────────────────────────────────────────────────
# Grand total of the primary record tables (the "how much real data" number).
CORE=$(( $(m inventory) + $(m adjustment) + $(m work_order) + $(m wo_item) \
       + $(m template) + $(m payment) + $(m product) + $(m entity) + $(m property) ))
header "TL;DR"
printf "  \033[1;32m%s core records\033[0m across 9 tables · \033[1m%s users\033[0m\n" \
  "$(commafy "$CORE")" "$(commafy "$(m user_total)")"
echo
