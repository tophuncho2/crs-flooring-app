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

