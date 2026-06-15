# BAD-HABBITS.md

> **Briefing:** Documents things yourself or Claude Code should not do — historical retention of past decisions that ended poorly, and obvious things to stay away from.

## Source control

- [ ] **Never commit `.claude/settings.local.json`.** It's per-worktree and local-only (excluded via `.git/info/exclude`, same as `.vscode/`). It carries each branch's own `plansDirectory` pointer; committing one would force every branch to the same plan folder. Never `git add` it, never move it into a tracked `.gitignore`, never commit it.
