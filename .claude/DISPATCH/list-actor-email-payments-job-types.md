# list-actor-email-payments-job-types — Surface the blank createdBy/updatedBy actor-email columns in the PAYMENTS and JOB-TYPES list views (pure render fix)

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
In the payments and job-types list views, the `createdBy`/`updatedBy` actor-email columns are declared and the data already arrives at the row, but the cell renderers have no `case` for them, so they fall through to the default and render blank ("-"). Add the two missing switch cases in each row-cell renderer so the values surface. This is a PURE RENDER FIX — no data, API, or domain change is needed.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ Cell formatting: bare string (`row.createdBy ?? "—"`) vs wrapped `<span>` — match each file's existing cell style for consistency (payments already uses `tabular-nums` spans for timestamps; pick what fits).
- ⚑ Null fallback char: the record views use em-dash `"—"`; some list cells use `"-"`. Pick to match the OTHER cells in the same file, not the record view.
- ⚑ Long emails may overflow the column — decide whether truncation is needed (there is no existing truncation in these cells today).

## Scope
In:  Add `"createdBy"` and `"updatedBy"` cases to the two list row-cell switch renderers so the already-arriving actor-email values render.
Out: Any data/API/domain/schema change (values already flow). The column-definition files. Any other module. Any shared engine. Truncation/styling overhauls beyond what the Flags decide.

## Files you own (do not edit anything outside this list)
- apps/web/modules/payments/components/list/table/payments-row-cell.tsx — add `"createdBy"`/`"updatedBy"` cases to the switch in `renderPaymentRowCell()` (~lines 15-41); they are currently missing and fall through to the default (~line 39) which returns "-".
- apps/web/modules/job-types/components/list/table/job-types-row-cell.tsx — add `"createdBy"`/`"updatedBy"` cases to the switch in `renderJobTypeRowCell()` (~lines 9-24); same missing cases, default (~line 23) returns "-".

## Layer-by-layer map
Module directory (the ONLY layer with work):
- payments-row-cell.tsx — the switch lacks the two actor-email cases. Add them, matching this file's local cell style. Note this file already imports `formatEasternDateTime` and uses `tabular-nums` spans for its timestamp cells — mirror that local style for the new cases.
- job-types-row-cell.tsx — same: add the two cases, matching this file's local cell style.

Read-only references (DO NOT edit — confirm the wiring, then leave alone):
- Column defs already declare both columns: payments-list-columns.ts (lines 11-12), job-types-list-columns.ts (lines 11-12).
- Data already flowing (payments): read-repo `findMany` has no `select`, so all fields incl `createdBy`/`updatedBy` come through — packages/db/src/flooring/payments/read-repository.ts:76-81; normalizer preserves them — packages/domain/src/flooring/payments/normalizers.ts:32-33.
- Data already flowing (job-types): packages/db/src/management/job-types/read-repository.ts:71-76; normalizer — packages/domain/src/management/job-types/normalizers.ts:20-21.
- Render-pattern reference: record views render these via `StaticFieldValue` with `value ?? "—"` (payment-primary-fields-section.tsx:103-111; job-type-primary-fields-section.tsx:65-74). For LIST cells the lightweight pattern returns a bare string/span with an em-dash fallback (see work-orders-row-cell.tsx, e.g. `case "createdAt": return <span className="tabular-nums">{...}</span>`).

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
