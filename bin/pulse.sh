#!/usr/bin/env bash
#
# Morning pulse — read-only production health check.
#
# A daily "is prod running smoothly?" board you run from any worktree. Every
# command here is STRICTLY read-only (status / logs / list) — no deploys, no
# migrations, no writes — so it can never hurt the running system.
#
# Scope (this pass): §1 Local/git · §2 CI & Backups (gh) · §3 Railway services.
# Deferred (coming next): DB outbox/staged-row SELECTs and Redis checks.
#
# Creds: prod-only. The single secret needed now is RAILWAY_TOKEN, read live
# from the main worktree's .env (single source of truth — no per-branch copies).
# Override the env file with:  PULSE_ENV=/path/to/.env bash bin/pulse.sh
#
# Run from anywhere:  bash bin/pulse.sh   (or, once wired, `npm run pulse`)

set -uo pipefail   # NOT -e: one failing check must not abort the whole board

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── config ──────────────────────────────────────────────────────────────────
PROD_ENV="main"                                  # Railway environment to watch
STATUS_SERVICES=(crs-flooring-app crs-flooring-relay crs-flooring-worker crs-flooring-db Redis)
LOG_SERVICES=(crs-flooring-app crs-flooring-relay crs-flooring-worker)  # error-grepped
LOG_LINES=200
BACKUP_WARN_HOURS=24     # backup older than this → 🟡
BACKUP_STALE_HOURS=26    # backup older than this (or failed) → 🔴
ERR_RE='error|fatal|unhandled|exception|econnrefused|etimedout|panic'

# ── presentation + roll-up ────────────────────────────────────────────────────
RED=0; YEL=0; GRN=0
header()   { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
line_ok()  { GRN=$((GRN+1)); printf "  \033[1;32m🟢 %-20s\033[0m %s\n" "$1" "${2:-}"; }
line_warn(){ YEL=$((YEL+1)); printf "  \033[1;33m🟡 %-20s\033[0m %s\n" "$1" "${2:-}"; }
line_bad() { RED=$((RED+1)); printf "  \033[1;31m🔴 %-20s\033[0m %s\n" "$1" "${2:-}"; }
line_info(){                 printf "  \033[2m•  %-20s %s\033[0m\n" "$1" "${2:-}"; }

# Portable bounded-run: prefer coreutils timeout/gtimeout, else run bare (our
# commands already self-terminate — `railway logs --lines` disables streaming).
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

# Whole-hours-ago for an ISO-8601 timestamp; empty string if unparseable/None.
age_hours() { # <iso>
  python3 - "$1" <<'PY'
import sys, datetime
iso = sys.argv[1]
if not iso or iso == "None":
    print(""); sys.exit(0)
iso = iso.replace("Z", "+00:00")
try:
    dt = datetime.datetime.fromisoformat(iso)
except ValueError:
    print(""); sys.exit(0)
now = datetime.datetime.now(datetime.timezone.utc)
print(round((now - dt).total_seconds() / 3600.0, 1))
PY
}

MAIN_WT="$(resolve_main_worktree)"
PROD_ENV_FILE="${PULSE_ENV:-${MAIN_WT:+$MAIN_WT/.env}}"

printf "\033[1m╭─ Morning pulse · prod (%s) · %s\033[0m\n" "$PROD_ENV" "$(date '+%a %b %d  %H:%M %Z')"
printf "\033[2m╰─ read-only · env-file: %s\033[0m\n" "${PROD_ENV_FILE:-<none found>}"

# ── §1 Local / git ────────────────────────────────────────────────────────────
header "§1  Local / git"
CUR_BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)"
CUR_DIRTY="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
line_info "this worktree" "$CUR_BRANCH ($CUR_DIRTY uncommitted)"

if [ -z "$MAIN_WT" ]; then
  line_warn "main worktree" "not found from here — skipping git prod checks"
else
  MAIN_DIRTY="$(git -C "$MAIN_WT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  # Best-effort fetch so ahead/behind reflects the deployed remote.
  if $TIMEOUT git -C "$MAIN_WT" fetch origin main --quiet 2>/dev/null; then
    counts="$(git -C "$MAIN_WT" rev-list --left-right --count main...origin/main 2>/dev/null)"
    ahead="$(echo "$counts" | awk '{print $1}')"; behind="$(echo "$counts" | awk '{print $2}')"
    if [ "${behind:-0}" -gt 0 ]; then
      line_warn "main vs origin" "$behind behind / $ahead ahead — local main trails deployed remote"
    elif [ "${ahead:-0}" -gt 0 ]; then
      line_warn "main vs origin" "$ahead ahead / $behind behind — unpushed commits on main"
    else
      line_ok "main vs origin" "in sync"
    fi
  else
    line_info "main vs origin" "fetch skipped (offline / no access)"
  fi
  if [ "${MAIN_DIRTY:-0}" -gt 0 ]; then
    line_warn "main worktree" "$MAIN_DIRTY uncommitted change(s)"
  else
    line_ok "main worktree" "clean"
  fi
fi

# ── §2 CI & Backups (GitHub Actions via gh) ───────────────────────────────────
header "§2  CI & Backups (GitHub)"
if ! command -v gh >/dev/null 2>&1; then
  line_warn "gh" "GitHub CLI not installed — skipped"
elif ! gh auth status >/dev/null 2>&1; then
  line_warn "gh" "not authenticated (run: gh auth login) — skipped"
else
  # Latest run of a workflow → "conclusion<TAB>createdAt" (built-in --jq, no jq dep).
  latest_run() { # <workflow-file> [branch]
    local wf="$1" br="${2:-}"
    if [ -n "$br" ]; then
      gh run list --workflow "$wf" --branch "$br" --limit 1 \
        --json conclusion,status,createdAt --jq '.[0] | "\(.conclusion // .status)\t\(.createdAt)"' 2>/dev/null
    else
      gh run list --workflow "$wf" --limit 1 \
        --json conclusion,status,createdAt --jq '.[0] | "\(.conclusion // .status)\t\(.createdAt)"' 2>/dev/null
    fi
  }

  # Backup (freshness matters most).
  IFS=$'\t' read -r bconc bcreated <<<"$(latest_run backup-railway-db.yml main)"
  if [ -z "${bconc:-}" ]; then
    line_bad "DB backup" "no runs found"
  else
    bage="$(age_hours "$bcreated")"; bh="${bage%.*}"
    if [ "$bconc" != "success" ]; then
      line_bad "DB backup" "last run $bconc (${bage}h ago)"
    elif [ "${bh:-0}" -ge "$BACKUP_STALE_HOURS" ]; then
      line_bad "DB backup" "stale — ${bage}h ago (>${BACKUP_STALE_HOURS}h)"
    elif [ "${bh:-0}" -ge "$BACKUP_WARN_HOURS" ]; then
      line_warn "DB backup" "aging — ${bage}h ago"
    else
      line_ok "DB backup" "success · ${bage}h ago"
    fi
  fi

  # CI on main (the deployed branch).
  IFS=$'\t' read -r cconc ccreated <<<"$(latest_run ci.yml main)"
  if [ -z "${cconc:-}" ]; then
    line_info "CI (main)" "no runs found"
  elif [ "$cconc" = "success" ]; then
    line_ok "CI (main)" "green · $(age_hours "$ccreated")h ago"
  elif [ "$cconc" = "in_progress" ] || [ "$cconc" = "queued" ]; then
    line_info "CI (main)" "running"
  else
    line_bad "CI (main)" "$cconc · $(age_hours "$ccreated")h ago"
  fi

  # Prune cron + restore drills (informational — latest run, any branch).
  for pair in "prune-db-tables.yml|prune-db-tables" \
              "restore-main-into-staging.yml|restore→staging" \
              "restore-main-into-dev.yml|restore→dev"; do
    wf="${pair%%|*}"; label="${pair##*|}"
    IFS=$'\t' read -r xconc xcreated <<<"$(latest_run "$wf")"
    if [ -z "${xconc:-}" ]; then
      line_info "$label" "no runs"
    elif [ "$xconc" = "success" ]; then
      line_ok "$label" "success · $(age_hours "$xcreated")h ago"
    elif [ "$xconc" = "in_progress" ] || [ "$xconc" = "queued" ]; then
      line_info "$label" "running"
    else
      line_warn "$label" "$xconc · $(age_hours "$xcreated")h ago"
    fi
  done
fi

# ── §3 Railway services (status + log error-grep) ─────────────────────────────
header "§3  Railway ($PROD_ENV env)"
RAILWAY_TOKEN="$(read_env_key "$PROD_ENV_FILE" RAILWAY_TOKEN)"
if ! command -v railway >/dev/null 2>&1; then
  line_warn "railway" "CLI not installed — skipped"
elif [ -z "$RAILWAY_TOKEN" ]; then
  line_warn "railway" "no RAILWAY_TOKEN in $PROD_ENV_FILE — skipped"
else
  export RAILWAY_TOKEN
  STATUS_JSON="$($TIMEOUT railway status --json 2>/dev/null)"
  if [ -z "$STATUS_JSON" ]; then
    line_bad "railway status" "no response (token invalid? run: railway whoami)"
  else
    # serviceName<TAB>status<TAB>deploymentStopped for the prod env only.
    # NB: program comes from the heredoc (stdin), so the JSON is passed as a
    # temp-file argv — can't feed both program and data through stdin.
    RW_JSON_TMP="/tmp/pulse_rw_json.$$"; printf '%s' "$STATUS_JSON" > "$RW_JSON_TMP"
    PROD_ENV="$PROD_ENV" python3 - "$RW_JSON_TMP" <<'PY' > /tmp/pulse_rw_status.$$
import json, os, sys
target = os.environ["PROD_ENV"]
with open(sys.argv[1]) as fh:
    d = json.load(fh)
for env in d.get("environments", {}).get("edges", []):
    n = env["node"]
    if n.get("name") != target:
        continue
    for si in n.get("serviceInstances", {}).get("edges", []):
        s = si["node"]
        dep = s.get("latestDeployment") or {}
        print("\t".join([
            str(s.get("serviceName")),
            str(dep.get("status")),
            str(dep.get("deploymentStopped")),
        ]))
PY
    while IFS=$'\t' read -r svc st stopped; do
      [ -z "$svc" ] && continue
      # Only report the services we care about.
      case " ${STATUS_SERVICES[*]} " in *" $svc "*) : ;; *) continue ;; esac
      if [ "$st" = "SUCCESS" ] && [ "$stopped" != "True" ]; then
        line_ok "$svc" "deployed (SUCCESS)"
      elif [ "$stopped" = "True" ]; then
        line_bad "$svc" "deployment stopped"
      else
        line_bad "$svc" "status=$st"
      fi
    done < /tmp/pulse_rw_status.$$
    rm -f /tmp/pulse_rw_status.$$ "$RW_JSON_TMP"
  fi

  # Recent-log error grep for the app services (heuristic → 🟡, not 🔴).
  for svc in "${LOG_SERVICES[@]}"; do
    logs="$($TIMEOUT railway logs --service "$svc" --environment "$PROD_ENV" --lines "$LOG_LINES" 2>/dev/null)"
    if [ -z "$logs" ]; then
      line_info "$svc logs" "no recent logs / unavailable"
      continue
    fi
    hits="$(echo "$logs" | grep -icE "$ERR_RE" 2>/dev/null | tr -d ' ')"
    if [ "${hits:-0}" -gt 0 ]; then
      sample="$(echo "$logs" | grep -iE "$ERR_RE" | tail -1 | cut -c1-70)"
      line_warn "$svc logs" "$hits error-ish line(s) in last $LOG_LINES · e.g. $sample"
    else
      line_ok "$svc logs" "clean (last $LOG_LINES lines)"
    fi
  done
fi

# ── TL;DR ─────────────────────────────────────────────────────────────────────
header "TL;DR"
if [ "$RED" -gt 0 ]; then
  printf "  \033[1;31m🔴 %d red\033[0m · \033[1;33m%d warn\033[0m · \033[1;32m%d ok\033[0m — drill into the red above.\n" "$RED" "$YEL" "$GRN"
elif [ "$YEL" -gt 0 ]; then
  printf "  \033[1;33m🟡 %d warn\033[0m · \033[1;32m%d ok\033[0m — glance at the warnings.\n" "$YEL" "$GRN"
else
  printf "  \033[1;32m🟢 all clear · %d ok\033[0m — prod looks healthy.\n" "$GRN"
fi
echo
exit "$([ "$RED" -gt 0 ] && echo 1 || echo 0)"
