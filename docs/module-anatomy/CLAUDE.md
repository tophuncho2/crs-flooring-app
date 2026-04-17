# Module Anatomy

Every module under `module-anatomy/{single-seeded,single-section,multi-section}/{module}/` carries two paired files:

- **`GRADING.md`** — current state. Per-layer letter grade and any open violations.
- **`PLANS.md`** — pending executions. Per-layer list of work still to land.

## Layer grouping (mandatory)

Both files are structured by architectural layer, in this exact order:

1. Domain
2. Data
3. Application
4. Server
5. API
6. Controller
7. UI

Every layer heading is always present. Do **not** delete a layer section because:

- it has no open violations
- its grade is A+
- it has no pending plan items

Empty sections render as `- (no open violations)` in `GRADING.md` or `- Plan: TBD` / `- (none)` in `PLANS.md`. The heading itself stays.

## GRADING.md contract

Per layer:

- `**Grade:**` — one letter (A–F, with `+`/`−` optional), or `TBD` when not yet assessed.
- Open violations as checkbox bullets (`- [ ]`). Each cites a file path + line when possible.
- Watch items as plain bullets (not checkboxes) when they're not violations but should stay visible.

## PLANS.md contract

Per layer:

- Pending executions as plain bullets, each specific enough to act on.
- `Plan: TBD` when the layer has no documented next step yet.
- Do not duplicate violations from `GRADING.md` — link or reference them instead.

## Why paired

`GRADING.md` answers "what's wrong right now." `PLANS.md` answers "what are we going to do about it." Keeping them in separate files makes it easy to see module health at a glance without scrolling through execution detail.
