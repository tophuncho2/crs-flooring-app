# warehouse-canonical-time-format — Replace the warehouse record-view's bespoke ISO-date `formatDate` with the canonical Eastern date/time formatter

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
The warehouse record view formats `createdAt`/`updatedAt` with a local `formatDate` that emits ISO-date-only (e.g. "2026-05-27"), out of step with every other module. Replace those two call sites with the canonical `formatEasternDateTime` (e.g. "May 27, 2026, 3:45 PM EDT") and delete the local function. This is the only module still carrying a bespoke date formatter.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ Scope of the fix: the record-view `formatDate` replacement is mandatory and unambiguous. SEPARATELY decide whether to ALSO add `createdAt`/`updatedAt` columns to the warehouse LIST view — every other module shows them, but the warehouse list currently renders neither (the underlying `WarehouseListRow` already carries the fields). This is an additive consistency call for the user, NOT part of the formatting-bug fix. If "no", touch only the record-view file.
- ⚑ Null-coalesce style: pick one consistently — job-types use `formatEasternDateTime(x ?? null) || "—"`, payments use `formatEasternDateTime(x) || "—"`. Both wrap in `StaticFieldValue`.

## Scope
In:  Swap the warehouse record-view's local `formatDate` for the canonical `formatEasternDateTime` at both call sites (`createdAt` + `updatedAt`) and delete the local function. Optionally (flag-gated) add `createdAt`/`updatedAt` columns to the warehouse list view to match every other module.
Out: Editing the canonical formatter itself; any domain/data/application/API layer change; any other module (payments, job-types, templates, work-orders) — those are read-only references only.

## Files you own (do not edit anything outside this list)
- `apps/web/modules/warehouse/components/record/primary/warehouse-primary-fields-section.tsx` — MANDATORY: delete local `formatDate` (lines ~14-19), import `formatEasternDateTime`, replace the `createdAt`/`updatedAt` call sites (lines ~88-93).
- `apps/web/modules/warehouse/components/list/table/warehouse-list-columns.ts` — ONLY if the list-column flag resolves "yes, add them".
- `apps/web/modules/warehouse/components/list/table/warehouse-row-cell.tsx` — ONLY if the list-column flag resolves "yes, add them".

## Layer-by-layer map

### Module directory — warehouse record view (mandatory)
- `apps/web/modules/warehouse/components/record/primary/warehouse-primary-fields-section.tsx`
  - Local `formatDate` at lines ~14-19 returns `parsed.toISOString().slice(0, 10)` → ISO-date-only. DELETE it entirely.
  - Applied to `createdAt` + `updatedAt` at lines ~88-93 via `<StaticFieldValue>{formatDate(createdAt ?? "")}</StaticFieldValue>`. Replace each with `formatEasternDateTime(...) || "—"` (style per the null-coalesce flag).
  - Import `formatEasternDateTime` from `@builders/domain`.

### Canonical formatter (read-only reference — never edit)
- `packages/domain/src/shared/date-format.ts:58-63` — `formatEasternDateTime(value: string | Date | null | undefined): string` (Intl Eastern wall-clock with tz abbreviation; returns `""` for null/empty). Exported via `@builders/domain` (`index.ts:13`).
- Reference usages to mirror (read-only): `payment-primary-fields-section.tsx:37-38/56-57` (`formatEasternDateTime(createdAt) || "—"`) and `job-type-primary-fields-section.tsx:57/62` (`formatEasternDateTime(createdAt ?? null) || "—"`). Both wrap in `StaticFieldValue`.

### Module directory — warehouse list view (flag-gated, optional)
- `WarehouseListRow` already carries `createdAt`/`updatedAt` (`packages/domain/src/flooring/warehouses/list-config.ts:10-11`), but `warehouse-list-columns.ts` and `warehouse-row-cell.tsx` render neither. The list therefore does NOT currently MIS-format time — it shows nothing. Only touch these two files if the flag resolves "yes, add the columns".

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
