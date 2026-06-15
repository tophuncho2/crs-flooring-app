# Work-tree-explanation.md

> **Briefing:** Explains how Railway environments, GitHub branches, local folders, and VS Code config/windows all connect and how you as a developer work between each.

## Branch flow

- [ ] main
- [ ] staging
- [ ] dev
- [ ] dev-1
- [ ] dev-2
- [ ] dev-3

## Main

- [ ] Live company data
- [ ] Users are logged in
- [ ] GitHub's default branch, primarily where GitHub Actions fire off from
- [ ] Edits never happen here first — always a clean fast-forward from staging

## Staging

- [ ] Not always a clean fast-forward from dev
- [ ] Can be used for hotfixes
- [ ] Not always - but typical branch for inspecting Railway, GitHub, or any top-level things

## Dev

- [ ] Sits over top of dev-1, 2 & 3
- [ ] Where those branches merge into
- [ ] Always wait for green deploys before merging in a second or 3rd branch

## Dev 1-3

- [ ] do not have live deployments, only localhost
- [ ] Shared DB with dev
- [ ] Where the bulk of editing happens

## Settings

- [ ] User opens a branch from its dedicated, checked-out local folder
- [ ] Worktrees are separated by checked-out local folders
- [ ] 1 window per branch when working
- [ ] Source control setup is good as is — don't mess it up. The two load-bearing invariants:
  - [ ] `.vscode/` is intentionally **local-only via `.git/info/exclude`** (not tracked, not in `.gitignore`) — never `git add` it, never move it into `.gitignore`, never commit it. This is what keeps each window's theme isolated to its branch.
  - [ ] Each `.vscode/settings.json` carries `git.ignoredRepositories` listing every sibling worktree + the container folder — don't remove entries. This is what keeps one window's Source Control panel from showing sibling branches.
- [ ] Each branch has its own theme in VS Code

