# Imports Module Migration — Revised Plan

**Supersedes** `docs/imports-module-migration-plan.md` after the 2026-04-25 scope decision.

## Context

The imports module rewrites its presentation layer from `@/modules/shared/engines/*` onto the new primitive tree at `apps/web/components/`. Engine controllers stay imported at their current paths — moving them out of `shared/engines/` is deferred to a later sweep to contain risk during the UI rewrite. The functional addition this sweep delivers is the mark-for-import controller surface plus a POST mutation route, so the staged-row worker flow (`flooring.imports.materialize`) becomes user-actionable.

Driver: the new primitive tree is in place under `apps/web/components/`; the imports module is the first consumer. After this sweep imports has a clean UI, the worker flow is wired, and the engine retains its controllers for inventory + future modules to keep using.

## Scope

**In scope**
- `apps/web/modules/imports/components/list/*` and `apps/web/modules/imports/components/record/*` swap presentation imports from `@/modules/shared/engines/{record-view/{sections,panel,forms,shell}, list-view/{scaffold,controls,table}, common/{display,feedback}}` to `apps/web/components/{cells,headers,fields,layout-grid,grid,badges,dropdowns,features}`.
- New controller surface in [`use-import-staged-inventory-rows-section.ts`](apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts): `selectedIds`, `toggleSelection`, `clearSelection`, `eligibleSelectedIds`, `markForImport()`.
- New POST route under `apps/web/app/api/imports/[id]/staged-inventory-rows/queue/` (or extend the existing section route with `?action=queue`) calling the producer use case.
- Test rewrite for `tests/modules/imports/imports-client.test.tsx`.

**Out of scope**
- Any extraction from `@/modules/shared/engines/*`. The §1.3 "stays" list of the original plan effectively expands to "everything except presentation."
- Inventory and cut-logs modules.
- Engine refactoring or deletion.
- Smoke-page deletion (next sweep gates that).
- Domain shape changes — `ImportRow`, `ImportDetail`, `StagedInventoryRow`, `ImportPrimaryForm` stay as-is.
- Grouping. Deferred — grouping becomes its own tool in a later sweep.

## Engine surfaces — stay vs. go

**Stay imported from engine** (no change to import paths):
- Controllers: `useSingleSectionRecordController`, `useRecordScopedSectionController`, `useSingleSectionCreateController`, `useRecordEntryNavigation`, `useConfiguredTableState`
- Scaffolds: `RecordDetailClientScaffold`, `RecordCreateClientScaffold`, `RecordDetailClientScaffoldContext`, `RecordMultiSectionPanel` (outer shell only — inner section render functions swap)
- Helpers: `createRecordSectionError`, `createLocalRecordRowId`, `buildRecordDetailHref`, `resolveRecordEntryReturnTo`, `buildDeleteConfirmationMessage`
- Types: `TablePreferencePayload`, `GroupedRowTree`
- Transport: `withMutationMeta`, `requestJson` from `engines/common/transport`

**Go** (replaced by `apps/web/components/*`):
- `record-view/sections/*` (RecordItemSection, RecordSectionGrid, RecordRowLayout, RecordItemCell, RecordRowStatusBadge, RecordPrimarySection, RecordPrimaryPane, RecordPrimaryFieldsGrid, RecordPrimaryFieldCell, RecordFormField, RecordGridCell{Input,Select,Dropdown})
- `record-view/panel/*` chrome (RecordPrimarySectionInstance, RecordSingleSectionPanel — but **not** the `RecordMultiSectionPanel` outer; only its section render bodies)
- `record-view/shell/record-panel-footer`
- `record-view/forms/form-field-styles` (`RECORD_FIELD_CONTROL_CLASS_NAME`, `RECORD_TEXTAREA_CONTROL_CLASS_NAME`)
- `list-view/scaffold/dashboard-list-page-scaffold`
- `list-view/controls/dashboard-list-page-controls`
- `list-view/table/*` (DashboardListPageTable, DashboardListRowCell, renderDashboardRowCells, renderGroupedTableRows, ClickableTableRow, TableEmptyRow, TablePaginationControls)
- `common/display/dashboard-card-title`, `common/display/accent-styles`
- `common/feedback/notices` (FormStatusNotices)

## Phase 0 — Pre-flight (5 min)

1. **Locate smoke pages.** The original plan opens with "the smoke pages prove the visual target" but they weren't found under `apps/web/app/dashboard/`. Search `apps/web/app/` and `apps/web/modules/` for `primitive-catalog`, `imports-list`, `imports-record` route segments. If none exist, drop the smoke-page acceptance criterion and rely on direct visual comparison against `/dashboard/imports`.
2. **Confirm primitive coverage.** Tick each of these — if any is missing, it lands in Phase 1 before the module changes:
   - Notices surface (positive `message` slot on `ActionHeader` or new `Notice` primitive under `apps/web/components/feedback/`)
   - SSR pagination via hrefs (optional `previousPageHref` / `nextPageHref` on `PaginateControls`)
   - Row-click affordance on `Grid` (`onRowClick(row)` prop or `clickable` flag)
   - Multiline text input (`TextCell multiline` prop or new `TextareaCell` primitive)

## Phase 1 — Close primitive gaps

Add only the missing primitives identified in Phase 0. No imports module file is touched.

**Acceptance:**
- `tsc --noEmit` clean for `apps/web/components/`.
- Existing tests green.
- Any smoke pages found in Phase 0 still render without console errors.

## Phase 2 — Migrate list view

Files: [`imports-client.tsx`](apps/web/modules/imports/components/list/imports-client.tsx), [`imports-table.tsx`](apps/web/modules/imports/components/list/imports-table.tsx).

`imports-table.tsx` body → `Grid<ImportRow>` with the same column set: `importNumber`, `tag`, `warehouseName`, `manufacturerName`, `percent`, `stagedInventoryRowsCount`, `liveInventoryRowsCount`, `createdAt`. Row-click via the new `onRowClick` prop. Empty state via `GridEmpty`. Pagination via `Grid`'s footer slot containing `PaginateControls` with hrefs.

`imports-client.tsx` outer panel → rounded-border wrapper containing `SectionHeader` (title + "+ Import" primary action) + filter bar (`SearchControl` + `SortToggle` + count summary) + `ImportsTable`. `useConfiguredTableState` stays — its outputs feed the new controls directly. Notices via the surface chosen in Phase 1.

Drop these imports from this folder:
- `@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold`
- `@/modules/shared/engines/list-view/controls/dashboard-list-page-controls`
- `@/modules/shared/engines/list-view/table/*`
- `@/modules/shared/engines/common/display/*`
- `@/modules/shared/engines/common/feedback/notices`

Keep `@/modules/shared/engines/list-view/controllers/*` (configured table state, table controls).

**Acceptance:**
- `/dashboard/imports` renders identically (no grouping).
- Search, sort, pagination, "+ Import", row click → record all work.
- `tests/modules/imports/imports-client.test.tsx` rewritten — engine-hook mocks replaced with controller-hook mocks; assertions retargeted to new primitive DOM.

## Phase 3 — Migrate record primary fields section

File: [`import-primary-fields-section.tsx`](apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx).

Replace `RecordPrimarySection` + two `RecordPrimaryPane`s + `RecordPrimaryFieldsGrid` with a single `FieldSection` (8-col `LayoutGrid`):
- `Order Number` → `TextCell editable`
- `Tag` → `TextCell editable`
- `Warehouse` → `SelectCell editable required`
- `Manufacturer` → `DropdownCell editable allowClear`
- `Notes` → multiline `TextCell` (or `TextareaCell` from Phase 1) full-row span

Drop all `from "@/modules/shared/engines/record-view"` imports from this file. Save / discard / dirty-state continues to drive from `useImportPrimarySection` (engine controller wrapper). The create flow (Phase 5) consumes this same file, so Phase 5 inherits the work.

**Acceptance:**
- Detail page primary section renders + edits + saves identically.
- Validation, dirty state, save / discard, conflict banner all still work.

## Phase 4 — Migrate staged rows section + mark-for-import (hero phase)

File: [`import-staged-inventory-rows-section.ts`](apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx) + [`use-import-staged-inventory-rows-section.ts`](apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts).

### 4a. Pre-flight — COMPLETE

Audit ran 2026-04-25; full report at [docs/imports-migration-phase-4a-audit.md](imports-migration-phase-4a-audit.md). Every pipeline link is shipped:

- **Producer:** `markStagedRowsForImportUseCase` at [packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts](../packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts) — atomic flip + outbox write, idempotency key `import-materialize:{id}:{sortedRowIds}`.
- **Consumer:** `materializeImportedStagedRowsUseCase` at [packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts](../packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts) — full verbatim + derived snapshot copy.
- **Topic registry:** [apps/relay/src/dispatch/dispatchers.ts](../apps/relay/src/dispatch/dispatchers.ts) — `flooring.imports.materialize` registered.
- **Worker handler:** [apps/worker/src/processors/materialize-import-batch.ts](../apps/worker/src/processors/materialize-import-batch.ts) — `StagedInventoryExecutionError` → `UnrecoverableError`.
- **Outbox infra:** [packages/db/src/queues/outbox-repository.ts](../packages/db/src/queues/outbox-repository.ts) — full lifecycle (`PENDING / PROCESSING / DISPATCHED / EXHAUSTED`).
- **API route:** **already exists** at `POST /api/imports/[id]/staged-inventory-rows/mark-for-import` — full mutation lifecycle, returns 202 with `{ batch: { markedRowIds, outboxEventId, wasDuplicate } }`. **No new route needed in this sweep.**
- **Client helper:** `markStagedRowsForImportRequest(importId, stagedRowIds)` already exported from [apps/web/modules/imports/data/mutations.ts](../apps/web/modules/imports/data/mutations.ts).

### 4b. Presentation (UI swap)

Build `STAGED_ROWS_LAYOUT: GridLayout<ImportStagedRowDraft>` with:
- `leadingControls: [{ key: "select", kind: "selection", width: 40 }]`
- `trailingControls: [{ key: "status", kind: "status-indicator", width: 116 }, { key: "remove", kind: "actions", width: 60 }]`

`renderCell` per column:
- `categoryFilter` → `DropdownCell allowClear`
- `product` → `DropdownCell` (filtered by `categoryFilterId`, current product always included)
- `itemNumber` → `TextCell`
- `startingStock` → `UnitCell` (unit from `selectedProduct?.stockUnit`)
- `location` → `SelectCell` (filtered by `record.warehouseId`)
- `dyeLot` → `TextCell`
- `cost`, `freight` → `CurrencyCell`
- `notes` → `TextCell`

`renderControl`:
- `selection` → `CheckboxCell editable={isRowEditable}` wired to `toggleSelection`
- `status-indicator` → `StatusBadge tone={statusTone(serverStatus)}`
- `actions` → existing remove button (disabled when locked)

Section chrome: `RecordItemSection` → `ActionHeader` hosting:
- title
- summary = row count + selection count + eligible count
- status pill (Ready-to-queue when eligible > 0)
- actions = `Add Row`, `Save Rows`, `Discard`, **`Run Import`**
- error slot

Drop all `from "@/modules/shared/engines/record-view"` imports from this file.

### 4c. Controller surface (additive)

Extend `useImportStagedInventoryRowsSection` with:
- `selectedIds: Set<string>`
- `toggleSelection(id: string): void`
- `clearSelection(): void`
- `eligibleSelectedIds: string[]` — derived: `row.status === 'DRAFT' && row.productId && row.startingStock`
- `markForImport(): Promise<void>` — calls `markStagedRowsForImportRequest` from `data/mutations.ts`. On success, clears selection and asks the parent to refetch staged rows + record (so QUEUED status flows back).

The mutation helper already exists; no new export. Phase 4d is dropped.

### 4d. ~~Mutation route~~ — already shipped (skipped)

The `POST /api/imports/[id]/staged-inventory-rows/mark-for-import` route is in tree and verified by Phase 4a. Bypass this section.

### 4e. Wire `Run Import`

ActionHeader's `actions` slot — disabled when `eligibleSelectedIds.length === 0`. On click → `controller.markForImport()`.

**Acceptance:**
- Staged rows section renders + edits + saves + adds + removes identically.
- Selection works; eligibility derivation correct (DRAFT + productId + startingStock > 0).
- `Run Import` enables only when ≥ 1 eligible row selected; on click, dispatches worker flow; status moves DRAFT → QUEUED on response (and → IMPORTED after worker materializes — verify via worker logs).
- Locked rows (QUEUED, IMPORTED) remain non-editable, non-removable, non-selectable.
- Tests cover the mark-for-import path: selection state, eligibility filter, mutation call shape.

## Phase 5 — Create flow + cleanup

Files: [`import-create-client.tsx`](apps/web/modules/imports/components/record/import-create-client.tsx), [`import-record-panel.tsx`](apps/web/modules/imports/components/record/import-record-panel.tsx), [`import-detail-client.tsx`](apps/web/modules/imports/components/record/import-detail-client.tsx).

- `import-create-client.tsx` — keep `RecordCreateClientScaffold` outer (owns dirty-slate + nav guard); swap `RecordSingleSectionPanel` and `RecordPanelFooter` for component-tree equivalents added in Phase 1 if needed. Inner `ImportPrimaryFieldsSection` already migrated in Phase 3.
- `import-record-panel.tsx` and `import-detail-client.tsx` — keep `RecordDetailClientScaffold` + `RecordMultiSectionPanel` outer shells (they own the unsaved-changes navigation guard). Verify no purely-visual engine cruft remains in their JSX.

**Final grep — must return zero matches:**
```sh
grep -rn "@/modules/shared/engines/list-view/scaffold\|@/modules/shared/engines/list-view/controls\|@/modules/shared/engines/list-view/table\|@/modules/shared/engines/record-view/sections\|@/modules/shared/engines/record-view/panel\|@/modules/shared/engines/record-view/forms\|@/modules/shared/engines/record-view/shell\|@/modules/shared/engines/common/display\|@/modules/shared/engines/common/feedback" apps/web/modules/imports/
```

Allowed remaining engine imports = the "stays" list above. Every other `@/modules/shared/engines/*` import in `apps/web/modules/imports/` must come from that list.

## Verification (end-to-end)

1. `bun test` (or repo runner) — green.
2. `tsc --noEmit` — clean.
3. Dev server, manual flow:
   - `/dashboard/imports` — list renders, search / sort / pagination work, row click opens detail, "+ Import" goes to create.
   - `/dashboard/imports/new` — create form saves and redirects to detail.
   - `/dashboard/imports/[id]` — primary fields edit + save + discard + conflict; staged rows add + edit + save + remove; **select rows → Run Import → status flips DRAFT → QUEUED → IMPORTED** (after worker run; verify worker logs show `flooring.imports.materialize` consumption).
4. Final grep returns zero matches.

## Risks

1. **Multiline text decision in Phase 1.** Notes field needs textarea today (`RECORD_TEXTAREA_CONTROL_CLASS_NAME`). Pick `TextCell multiline` prop or new `TextareaCell` primitive — small Phase 1 call, but blocks Phase 3.
2. **Worker pipeline gaps.** Phase 4a is the gate. If `materialize` topic isn't registered or the worker handler doesn't exist, the route ships as 501 and worker wiring becomes its own ticket. Don't extend scope into the worker domain in this sweep.
3. **Test rewrite scope.** Existing test file mocks deep engine hooks (`useTableColumns`, `useServerTableQueryControls`). After migration those mocks point to dead code and assertions need full retargeting — non-trivial time in Phase 2 and Phase 5.
4. **Visual delta on staged-rows header row.** Engine renders column labels above row 1 only; new `Grid` has a real sticky header. Confirm acceptable before Phase 4 lands.
5. **`RecordMultiSectionPanel` boundary.** Confirm during Phase 5 that its inner section descriptors accept the new primitive JSX — i.e. that `render: () => <ActionHeader>...</ActionHeader>` works without engine wrappers. If the panel renderer assumes `RecordItemSection` shape, scope grows by one small refactor.
