#!/usr/bin/env bash
#
# Fleet board — read-only dev-family branch-sync recon.
#
# The standalone form of the /dispatch-begin git recon: discover every dev-N
# sub-branch, measure each one's commits behind / ahead of the LOCAL `dev` ref,
# its worktree clean/dirty state, and its tip. A "where does every branch stand?"
# board you run before splitting work with /dispatch. Sibling of the pulse
# (health) and scale (volume) boards.
#
# STRICTLY read-only: enumerates + inspects git refs and worktrees. NO fetch, no
# merge, no push, no checkout — it never mutates anything. Comparisons are
# against the LOCAL dev ref (no refresh from origin); the banner says so.
#
# Scope: dev family only (dev-1 .. dev-N vs dev). A future `fleet:all` adds
# staging + main — see the TARGETS seam below.
#
# Run from any worktree:  bash bin/fleet.sh   (or `npm run fleet`)

set -uo pipefail   # NOT -e: we measure each branch independently, never abort

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── config ──────────────────────────────────────────────────────────────────
BASE="dev"          # the ref every sub-branch forks from + is measured against
TIP_MAX=40          # truncate the tip subject to this many chars (ASCII "...")

# ── presentation (color lives ONLY here + the TL;DR — never in the grid) ──────
header() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }

# ── helpers ───────────────────────────────────────────────────────────────────
# Worktree path for a given branch. Uses substr($0,10) to strip the "worktree "
# prefix (9 chars + space) so a repo path containing "Code Projects" survives.
worktree_for() { # <branch>
  git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null \
    | awk -v b="refs/heads/$1" '
        /^worktree /{p=substr($0,10)}
        $0=="branch "b{print p; exit}'
}

# Truncate to TIP_MAX with an ASCII "..." (never the multibyte "…", which would
# skew the box-table column width — awk length() counts bytes).
truncate_tip() { # <string>
  awk -v s="$1" -v n="$TIP_MAX" 'BEGIN{ if(length(s)>n) s=substr(s,1,n-3)"..."; print s }'
}

# Box-table renderer. Reads pipe-delimited rows on stdin, first row = header.
# Computes each column width as max(header,cells) then draws a ┌─┬─┐ grid.
# Cells MUST be plain ASCII — any ANSI/emoji would break the byte-width math.
render_box() {
  awk -F'|' '
    { rows++; for (i=1;i<=NF;i++){ cell[rows,i]=$i; if(i>ncol)ncol=i
        if(length($i)>w[i])w[i]=length($i) } }
    function rule(l,m,r,   s,i,j){ s=l
        for(i=1;i<=ncol;i++){ for(j=0;j<w[i]+2;j++)s=s"─"; s=s (i<ncol?m:r) }
        print s }
    function line(n,   s,i,j,c){ s="│"
        for(i=1;i<=ncol;i++){ c=cell[n,i]; s=s" "c
            for(j=length(c);j<w[i];j++)s=s" "; s=s" │" }
        print s }
    END{ if(!rows)exit
        rule("┌","┬","┐"); line(1); rule("├","┼","┤")
        for(n=2;n<=rows;n++)line(n); rule("└","┴","┘") }'
}

# ── discover the dev-N family ─────────────────────────────────────────────────
if ! git -C "$REPO_ROOT" rev-parse --verify --quiet "$BASE" >/dev/null; then
  printf "\033[1;31m✗ base ref '%s' not found — cannot measure.\033[0m\n" "$BASE" >&2
  exit 1
fi
BASE_SHA="$(git -C "$REPO_ROOT" rev-parse --short "$BASE")"
# Trim leading/trailing whitespace — some commit subjects carry stray padding.
BASE_SUB="$(git -C "$REPO_ROOT" log -1 --format='%s' "$BASE" | awk '{$1=$1; print}')"

# The target branch list. Future `fleet:all` appends "staging" "main" here.
TARGETS=()
while IFS= read -r b; do TARGETS+=("$b"); done < <(
  git -C "$REPO_ROOT" for-each-ref --format='%(refname:short)' refs/heads/ \
    | grep -E '^dev-[0-9]+$' | sort -V)

# ── banner ────────────────────────────────────────────────────────────────────
printf "\033[1m╭─ Fleet · dev family · %s\033[0m\n" "$(date '+%a %b %d  %H:%M %Z')"
printf "\033[2m╰─ read-only · refs are LOCAL (no fetch) · base: %s @ %s \"%s\"\033[0m\n" \
  "$BASE" "$BASE_SHA" "$BASE_SUB"

if [ "${#TARGETS[@]}" -eq 0 ]; then
  header "No dev-N branches found"
  printf "  \033[2m•  nothing matches refs/heads/dev-[0-9]+\033[0m\n\n"
  exit 0
fi

# ── measure each branch, build the table + tally ──────────────────────────────
IN_SYNC=0; ATTENTION=(); TABLE="Branch|Worktree|Behind dev|Ahead of dev|Tree|Tip"
for b in "${TARGETS[@]}"; do
  counts="$(git -C "$REPO_ROOT" rev-list --left-right --count "$BASE...$b" 2>/dev/null)"
  behind="$(echo "$counts" | awk '{print $1+0}')"
  ahead="$(echo "$counts"  | awk '{print $2+0}')"
  wt="$(worktree_for "$b")"
  if [ -n "$wt" ] && [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
    tree="dirty"
  else
    tree="clean"
  fi
  tip="$(truncate_tip "$(git -C "$REPO_ROOT" log -1 --format='%h %s' "$b")")"
  TABLE+=$'\n'"$b|../$b|$behind|$ahead|$tree|$tip"

  # In sync = 0 behind, 0 ahead, clean tree. Otherwise flag with the reason.
  if [ "$behind" -eq 0 ] && [ "$ahead" -eq 0 ] && [ "$tree" = "clean" ]; then
    IN_SYNC=$((IN_SYNC+1))
  else
    reason=""
    [ "$behind" -gt 0 ] && reason="${reason}${behind}↓ "
    [ "$ahead"  -gt 0 ] && reason="${reason}${ahead}↑ "
    [ "$tree" = "dirty" ] && reason="${reason}dirty "
    ATTENTION+=("$b: ${reason% }")
  fi
done

echo
printf '%s\n' "$TABLE" | render_box

# ── TL;DR (colored — outside the grid) ────────────────────────────────────────
header "TL;DR"
if [ "${#ATTENTION[@]}" -eq 0 ]; then
  printf "  \033[1;32m🟢 all %d branches clean & in sync with %s\033[0m\n\n" \
    "$IN_SYNC" "$BASE"
else
  # Join the flagged branches: "dev-2: 3↓ dirty · dev-4: 1↑"
  joined="$(printf '%s · ' "${ATTENTION[@]}")"; joined="${joined% · }"
  printf "  \033[1;32m🟢 %d in sync\033[0m · \033[1;33m🟡 %d needs attention\033[0m (%s)\n\n" \
    "$IN_SYNC" "${#ATTENTION[@]}" "$joined"
fi

exit 0   # informational recon — never fails the shell
