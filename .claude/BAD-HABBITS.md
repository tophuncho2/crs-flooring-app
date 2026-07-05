# BAD-HABBITS.md

> **Briefing:** Documents things yourself or Claude Code should not do — historical retention of past decisions that ended poorly, and obvious things to stay away from.

## Source control

- [ ] **Never commit `.claude/settings.local.json`.** It's per-worktree and local-only (excluded via `.git/info/exclude`, same as `.vscode/`). It carries each branch's own `plansDirectory` pointer; committing one would force every branch to the same plan folder. Never `git add` it, never move it into a tracked `.gitignore`, never commit it.

- [ ] **Never store or state commit/push/migration status without confirming it against live state first.** Do not write "green NOT committed", "already pushed", "migration applied", "tree clean", or any similar claim into memory (MEMORY.md or entries) or into a reply unless you have just verified it — `git status`, `git log`/`rev-list` vs origin, or the actual migrations state. These claims go stale almost every session: work described as "NOT committed" has usually been committed and merged since, so a stored claim is wrong more often than right and misleads the next session. If you haven't checked, say the live git/db state is the source of truth and go check — don't assert or record it. (This is why `/session-confirm` exists.)
