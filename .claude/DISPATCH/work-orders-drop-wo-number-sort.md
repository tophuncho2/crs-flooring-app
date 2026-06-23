# work-orders-drop-wo-number-sort — Remove the wo# manual sort option from the work-orders list view

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
On the work-orders LIST view, remove the manual sort option on the wo# (workOrderNumber / record-number) column. The createdAt sort stays and remains the default, on the principle that we never sort by row# — createdAt is how recency is ordered. This is a UI/contract-only change; no DB or schema work.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ None — intent is unambiguous. Research-validate, then execute. (One thing to confirm in passing: the list's default sort is already `createdAt desc`, so dropping the wo# option does not strand the default — verify this still holds in the live code.)

## Scope
In:  Remove `"workOrderNumber"` as a selectable manual sort field on the work-orders list — across the request contract, the sort-picker UI, and the client's allowed-sort validation, so UI and validation agree (a lingering value in a bookmarked URL must no longer be honored). Keep the createdAt sort and its default behavior.
Out: The DB read-repository sort fieldMap (leaving its unused workOrderNumber entry is fine — do not touch). Any column-definition / row-cell / domain-type / schema work. The payments, job-types, warehouse, and templates modules. Default-sort behavior is already createdAt desc and must not change.

## Files you own (do not edit anything outside this list)
- apps/web/modules/work-orders/data/list-work-orders-request.ts — remove `"workOrderNumber"` from `WORK_ORDERS_LIST_SORT_FIELDS` (~37-43).
- apps/web/modules/work-orders/components/list/toolbar-controls/sort-picker-chip.tsx — remove `"workOrderNumber"` from the `SortPickerField` type union (~6-11), `FIELD_LABEL` (~24), `FIELD_SHORT` (~32), `DIRECTION_LABELS` (~41), and the `FIELDS` array (~44-50).
- apps/web/modules/work-orders/components/list/work-orders-client.tsx — remove `"workOrderNumber"` from `WORK_ORDERS_ALLOWED_SORT_FIELDS` (~34-40); confirm `initialSort` stays `createdAt` desc (~93).

## Layer-by-layer map

Three spots must stay in sync; the DB layer needs NO change:
- Module dir — data/list-work-orders-request.ts:37-43 — drop `"workOrderNumber"` from `WORK_ORDERS_LIST_SORT_FIELDS`.
- Module dir — components/list/toolbar-controls/sort-picker-chip.tsx — drop `"workOrderNumber"` from the type union (~6-11), `FIELD_LABEL` (~24), `FIELD_SHORT` (~32), `DIRECTION_LABELS` (~41), and the `FIELDS` array (~44-50).
- Module dir — components/list/work-orders-client.tsx:34-40 — drop `"workOrderNumber"` from `WORK_ORDERS_ALLOWED_SORT_FIELDS`.
- Reference only (do NOT edit) — the DB read-repo `buildWorkOrdersOrderBy` (packages/db/src/flooring/work-orders/read-repository.ts:154-163) still maps workOrderNumber but is harmless to leave unused; the createdAt tiebreaker (~182) remains. Default sort is already createdAt desc (work-orders-client.tsx ~93 initialSort), so removal does NOT break the list.

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
