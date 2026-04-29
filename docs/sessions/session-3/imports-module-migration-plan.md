# Imports Module Migration Plan

**Scope:** `apps/web/modules/imports/` — list view + record view (detail + create) — moves off the engine and onto `apps/web/components/` primitives. **Only the imports module.** Inventory, cut logs, and other modules are explicitly out of scope and stay on the engine.

**Driver:** the new primitive tree under `apps/web/components/` is in place, the smoke pages prove the visual target. The current module reads from `@/modules/shared/engines/{record-view,list-view,common}/` and that's the surface this sweep removes.

**Non-goal:** removing or refactoring the engine itself. The engine stays put for every other module.

---

## 1 · Audit findings

### 1.1 Module file inventory (965 LOC across 7 files)

| File | LOC | Engine surface consumed |
|---|---|---|
| `components/list/imports-client.tsx` | 160 | `DashboardListPageScaffold`, `DashboardListPageControls`, `TablePaginationControls`, `useConfiguredTableState`, `GroupedRowTree`, `TablePreferencePayload`, `DashboardCardTitle`, `FormStatusNotices`, `FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME` |
| `components/list/imports-table.tsx` | 118 | `DashboardListPageTable`, `DashboardListRowCell`, `renderDashboardRowCells`, `renderGroupedTableRows`, `ClickableTableRow`, `TableEmptyRow`, `TablePaginationControls` (+ `formatStableDate` from `@builders/domain`) |
| `components/record/import-detail-client.tsx` | 61 | `RecordDetailClientScaffold`, `RecordDetailClientScaffoldContext` |
| `components/record/import-record-panel.tsx` | 146 | `RecordMultiSectionPanel`, `RecordPrimarySectionInstance`, `buildDeleteConfirmationMessage` |
| `components/record/import-create-client.tsx` | 93 | `RecordCreateClientScaffold`, `RecordSingleSectionPanel`, `RecordPanelFooter`, `useSingleSectionCreateController`, `buildRecordDetailHref` |
| `components/record/sections/import-primary-fields-section.tsx` | 106 | `RecordPrimarySection`, `RecordPrimaryPane`, `RecordPrimaryFieldsGrid`, `RecordPrimaryFieldCell`, `RecordFormField`, `RECORD_FIELD_CONTROL_CLASS_NAME`, `RECORD_TEXTAREA_CONTROL_CLASS_NAME` |
| `components/record/sections/import-staged-inventory-rows-section.tsx` | 281 | `RecordItemSection`, `RecordItemSectionControls`, `RecordSectionGrid`, `RecordSectionGridRow`, `RecordRowLayout`, `RecordItemCell`, `RecordRowColumnSpec`, `RecordGridCellInput`, `RecordGridCellSelect`, `RecordGridCellDropdown`, `RecordRowStatusBadge`, `RecordSectionSubHeaderProps` |

### 1.2 Controller layer (stays — explicit user direction)

- `controllers/use-imports-list-controller.ts` — wraps `useRecordEntryNavigation` (engine common). Stays.
- `controllers/use-import-primary-section.ts` — wraps `useSingleSectionRecordController` + `createRecordSectionError`. Stays.
- `controllers/use-import-staged-inventory-rows-section.ts` — wraps `useRecordScopedSectionController`, `createLocalRecordRowId`, `createRecordSectionError`. Stays.
- `controllers/drafts.ts` — pure types + validation. No engine dep. Untouched.

The save/discard/dirty-slate machinery lives in those engine controller hooks (`useSingleSectionRecordController`, `useRecordScopedSectionController`, `useSingleSectionCreateController`) — confirmed staying.

### 1.3 Engine surfaces split into "stay" vs. "go"

**Stays imported from engine (controllers + page-level scaffolds that own dirty-slate routing):**
- `useSingleSectionRecordController`, `useRecordScopedSectionController`, `useSingleSectionCreateController`
- `createRecordSectionError`, `createLocalRecordRowId`
- `RecordDetailClientScaffold`, `RecordCreateClientScaffold`, `RecordDetailClientScaffoldContext` — these own page chrome + the unsaved-changes navigation guard, which the new tree doesn't replicate
- `useRecordEntryNavigation`, `buildRecordDetailHref`, `resolveRecordEntryReturnTo`
- `useConfiguredTableState`, `TablePreferencePayload`, `GroupedRowTree` (list controller hook + its types)

**Goes (replaced by `components/` primitives):**
- All of `record-view/sections/*` (RecordItemSection, RecordSectionGrid, RecordRowLayout, RecordItemCell, RecordRowStatusBadge, RecordPrimarySection, RecordPrimaryPane, RecordPrimaryFieldsGrid, RecordPrimaryFieldCell, RecordFormField, the three RecordGridCell* inputs)
- `record-view/panel/*` view chrome (RecordMultiSectionPanel renderer, RecordPrimarySectionInstance, RecordSingleSectionPanel)
- `record-view/shell/record-panel-footer` (in the create flow)
- `record-view/forms/form-field-styles` (RECORD_FIELD_CONTROL_CLASS_NAME, RECORD_TEXTAREA_CONTROL_CLASS_NAME)
- `list-view/scaffold/dashboard-list-page-scaffold`
- `list-view/controls/dashboard-list-page-controls`
- `list-view/table/*` (DashboardListPageTable, DashboardListRowCell, renderDashboardRowCells, renderGroupedTableRows, ClickableTableRow, TableEmptyRow, TablePaginationControls)
- `common/display/dashboard-card-title`, `common/display/accent-styles` (FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME)
- `common/feedback/notices` (FormStatusNotices) — surface notice slots on the new headers instead
- `common/feedback/confirm-delete` (buildDeleteConfirmationMessage) — small helper, decide stay vs. local copy

### 1.4 Smoke-page coverage vs. real module — gaps

The smoke pages are visually faithful but skip behaviour the real module has. These are NOT just JSX swaps:

1. **Save / Discard / dirty section subheader.** Smoke record page has no Save/Discard buttons, no dirty indicator, no save error/notice surface. The primary section's `RecordPrimarySectionInstance` and the staged-rows section's `subHeader` both render Save+Discard+saving-label+conflict-banner. New tree has `ActionHeader` (title/summary/status/actions/error) — that's the target slot, but the wiring from controller state → ActionHeader props is net-new.
2. **Multi-section dirty-slate coordination.** `RecordMultiSectionPanel` collates dirty sections, blocks navigation, and renders the bottom delete-record footer. The new tree has none of this — and the user said the dirty-slate controllers stay. Resolution: keep `RecordDetailClientScaffold` + `RecordMultiSectionPanel` in place, replace only the `render: () => …` JSX inside each section descriptor.
3. **Notices.** `noticeMessage` / `noticeError` from each section need a surface. New tree has no `FormStatusNotices` equivalent — either add a small `<Notice>` primitive under `components/feedback/` or fold into `ActionHeader`'s existing `error` + a new `message` prop.
4. **Grouping.** List currently supports group-by warehouse / manufacturer with collapsible groups. New tree has `GroupTree` under `features/group/` but it's standalone — not wired into `Grid`. Two options:
   - (a) keep grouping, compose `GroupTree` over `Grid` rows in the consumer
   - (b) defer grouping — ship the migration with flat list only, restore grouping in a follow-up
5. **Table preferences (saved column visibility / sort / group state).** `useConfiguredTableState` reads/writes `TablePreferencePayload`. The new feature controls are stateless — preference persistence has to be threaded through manually, or the controller stays as the source of truth and just feeds the new controls.
6. **Server-side pagination via hrefs.** List page accepts `previousPageHref` / `nextPageHref` for SSR pagination. `PaginateControls` currently exposes only `onPreviousPage` / `onNextPage` callbacks — needs href support added or a small adapter in the consumer.
7. **Per-row click → open record.** `ClickableTableRow` makes the entire row clickable with aria-label. New `Grid` renders rows but doesn't ship a row-click affordance — needs to be added to the layout (an `onRowClick` prop) or done via a control column with a hidden full-row button.
8. **Status indicator column for staged rows.** Existing section uses a `RecordRowStatusBadge` inside a regular cell + remove via `RecordItemSectionControls`. New tree has `status-indicator` / `actions` control kinds on `Grid` (smoke page already proves it). Clean swap.
9. **First-row label rendering (`showLabel={index === 0}`).** Engine cells render labels above the first row only — that's how the section reads "Filter / Product / Item # / …" as headers. New `Grid` has a real header row, so this concept goes away — visual change worth flagging.
10. **Smoke page assumes status field on `StagedInventoryRow`.** Confirmed: real `StagedInventoryRow` already carries `status` (`FlooringStagedRowStatus`) — used today to lock non-DRAFT rows. No domain change needed for parity.

### 1.5 External consumers of the imports module

Outside the module folder:
- `app/dashboard/imports/page.tsx` — list loader → `ImportsClient` (default export)
- `app/dashboard/imports/[id]/page.tsx` — detail loader → `ImportDetailClient` (named)
- `app/dashboard/imports/new/page.tsx` — create loader → `ImportCreateClient` (named)
- `app/api/imports/options/route.ts` — only touches `data/queries.ts`, unaffected
- `tests/modules/imports/imports-client.test.tsx` — exercises all three client components, mocks engine hooks; will need rewriting against new primitive tree

The three loader pages don't need to change unless the client component prop signatures change. Plan keeps them stable.

### 1.6 Mark-for-import additive (rehearsed in smoke page)

The record-view smoke page demonstrates a Run Import action driven by row selection + DRAFT/eligibility derivation — **none of this exists in the real module today**. This is genuinely new controller surface. Treat as a parallel deliverable inside the same sweep:

- New mutation route: `POST /api/imports/[id]/staged-inventory-rows/queue` (or fold into existing route under `?action=queue`)
- New controller surface on `useImportStagedInventoryRowsSection`: `selectedIds`, `toggleSelection`, `eligibleSelectedIds`, `markForImport()`
- New ActionHeader slot wiring (eligible count + Run button) in the staged-rows section JSX
- Worker job already exists per project memory (sweep 4c done) — confirm before wiring.

---

## 2 · Phased plan

Five phases. Each phase is mergeable on its own.

### Phase 1 — Verify smoke pages + close primitive gaps

**Goal:** make sure the new tree can express everything the imports module needs, before we touch the module.

1. Run the dev server, exercise both smoke pages — primitive catalog, imports-list, imports-record. Confirm visual parity with the real `/dashboard/imports` and `/dashboard/imports/[id]`. Note any visual gaps in writing.
2. Decide each gap from §1.4:
   - **Notices surface:** add `error` + `message` props on `ActionHeader` (or new `Notice` primitive under `components/feedback/`).
   - **Pagination hrefs:** add optional `previousPageHref` / `nextPageHref` props to `PaginateControls`.
   - **Row click → open record:** add `onRowClick(row)` to `Grid` (or `clickable: boolean` flag).
   - **Grouping:** decide stay vs. defer. Recommend defer to a follow-up phase to keep this sweep small.
3. Land any missing primitive features. Smoke pages stay green.

**Deliverable:** primitive tree fully covers imports needs. No module file touched.

**Acceptance:**
- All three smoke routes render without console errors.
- `tsc --noEmit` clean for `apps/web/components/`.
- `bun test` (or whichever runner) green.

---

### Phase 2 — Migrate the list view

**Goal:** swap `imports-client.tsx` + `imports-table.tsx` to consume `components/`.

1. Replace `imports-table.tsx` body with `Grid<ImportRow>`. Layout = the same column set, mapped to `GridLayout<ImportRow>` (`importNumber`, `tag`, `warehouseName`, `manufacturerName`, `percent`, `stagedInventoryRowsCount`, `liveInventoryRowsCount`, `createdAt`). Row click via the new `onRowClick` prop. Empty state via `GridEmpty`. Pagination via `Grid.footerSlot={<PaginateControls …>}`.
2. Replace `imports-client.tsx` scaffold:
   - Outer panel: rounded-border `<div>` wrapping `SectionHeader` (title + primary action) + filter bar + `ImportsTable`. Pattern matches imports-list smoke page.
   - Filter bar: `SearchControl` + `SortToggle` + count summary (currently inside `DashboardListPageControls`).
   - Notices: render via the chosen surface from Phase 1.
   - `useConfiguredTableState` stays (it owns server-state coordination + table preferences). Its outputs feed the new controls directly.
3. **Decide grouping:** if deferring, drop `groupedRowTree` / `isGroupingEnabled` from the JSX and let the controller compute them in case it's needed later. If keeping, compose `GroupTree` over `Grid` per smoke pattern.
4. Drop all imports of `DashboardList*`, `DashboardCardTitle`, `FormStatusNotices`, `FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME`, `formatStableDate` (or move it to the row renderer locally).

**Acceptance:**
- `/dashboard/imports` renders identically (modulo grouping if deferred).
- Search, sort, pagination, "+ Import" button, row click → record, all work.
- Test file updated: replace engine-hook mocks with controller-hook mocks; assertions retargeted to new primitive DOM.
- No `from "@/modules/shared/engines/list-view"` or `from "@/modules/shared/engines/common"` imports remain in `modules/imports/components/list/`.

---

### Phase 3 — Migrate the record primary fields section

**Goal:** swap `import-primary-fields-section.tsx` to `FieldSection` + `FormField` + cells.

1. Replace `RecordPrimarySection` + two `RecordPrimaryPane`s + `RecordPrimaryFieldsGrid` with a single `FieldSection` (8-col invisible LayoutGrid).
2. Map fields onto `CellAt` placements. Smoke page already proves the layout — copy the col/colSpan choices verbatim:
   - `Order Number` → `TextCell editable`
   - `Tag` → `TextCell editable`
   - `Warehouse` → `SelectCell editable required` (or `DropdownCell` if allowing search)
   - `Manufacturer` → `DropdownCell editable allowClear`
   - `Notes` → `TextCell editable` full-row span (multiline TBD — confirm `TextCell` supports textarea mode or add a `MultilineTextCell` primitive in Phase 1)
3. Drop all `from "@/modules/shared/engines/record-view"` imports from this file.
4. Confirm `disabled={controller.primarySection.isSaving}` semantics still work — `editable: false` when saving.

**Acceptance:**
- Detail page primary section renders + edits + saves identically.
- Validation, dirty state, save/discard, conflict banner all still drive from `useImportPrimarySection`.
- The create flow (`import-create-client.tsx`) still works — it imports `ImportPrimaryFieldsSection` too.

---

### Phase 4 — Migrate the record staged inventory rows section

**Goal:** swap `import-staged-inventory-rows-section.tsx` to `Grid<StagedRow>` with selection + status-indicator + actions controls. **Includes the mark-for-import additive.**

1. Build `STAGED_ROWS_LAYOUT: GridLayout<ImportStagedRowDraft>` — same column set as today, plus `leadingControls: [{ key: "select", kind: "selection", width: 40 }]` and `trailingControls: [{ key: "status", kind: "status-indicator", width: 116 }, { key: "remove", kind: "actions", width: 60 }]`. Smoke page is the template.
2. `renderCell` per column:
   - `categoryFilter` → `DropdownCell` (allowClear)
   - `product` → `DropdownCell` (filtered by `categoryFilterId`, current product always included)
   - `itemNumber` → `TextCell`
   - `startingStock` → `UnitCell` (unit comes from `selectedProduct?.stockUnit`)
   - `location` → `SelectCell` (filtered by `record.warehouseId`)
   - `dyeLot` → `TextCell`
   - `cost` → `CurrencyCell`
   - `freight` → `CurrencyCell`
   - `notes` → `TextCell`
3. `renderControl`:
   - selection → `CheckboxCell editable={isRowEditable}` + `toggleSelection`
   - status-indicator → `StatusBadge tone={statusTone(serverStatus)}`
   - actions → existing remove button (disabled when locked)
4. Section chrome: replace `RecordItemSection` with `ActionHeader` + body wrapper. ActionHeader hosts: title, summary (row count + selection count + eligible count), status (Ready-to-queue when eligible > 0), actions (`Add Row`, `Save Rows`, `Discard`, **`Run Import`**), error.
5. **Mark-for-import additive (new — sweep 4c worker dependency):**
   - Extend `useImportStagedInventoryRowsSection` controller with: `selectedIds: Set<string>`, `toggleSelection(id)`, `clearSelection()`, `eligibleSelectedIds: string[]` (DRAFT + productId + startingStock), `markForImport(): Promise<void>` (calls a new mutation).
   - Add `data/mutations.ts → queueImportStagedRowsRequest(importId, ids, expectedUpdatedAt)`.
   - Add `app/api/imports/[id]/staged-inventory-rows/queue/route.ts` (or extend the existing section route) — POST mutation that hands the ids to the existing worker dispatch use case.
   - Wire `markForImport` to the ActionHeader's `Run Import` action; disable when `eligibleSelectedIds.length === 0`.
6. Drop all `from "@/modules/shared/engines/record-view"` imports from this file. (Status-cell engine `RecordRowStatusBadge` → primitive `StatusBadge`.)

**Acceptance:**
- Detail page staged-rows section renders + edits + saves + adds + removes identically.
- Selection works; eligibility derivation correct (DRAFT + product + stock).
- Run Import button enables only when ≥ 1 eligible row selected; on click, dispatches worker; status moves DRAFT → QUEUED → IMPORTED in real time (or after refresh, matching current async behaviour).
- Locked rows (QUEUED, IMPORTED) remain non-editable, non-removable, non-selectable.
- Test coverage: extend imports-client test or add a focused staged-rows test for the mark-for-import path.

---

### Phase 5 — Migrate the create flow + cleanup

**Goal:** finish the imports module, prove no engine imports remain.

1. `import-create-client.tsx` → swap `RecordSingleSectionPanel` + `RecordPanelFooter` for new tree equivalents (or, if `RecordSingleSectionPanel` is one of the dirty-slate-bearing pieces, leave it and only swap the inner `ImportPrimaryFieldsSection` — already done in Phase 3). Decide based on Phase 1 audit of which scaffolds bear dirty-slate vs. pure chrome.
2. `import-record-panel.tsx` and `import-detail-client.tsx` — keep the `RecordDetailClientScaffold` + `RecordMultiSectionPanel` outer shells (they own navigation guarding). Verify no purely-visual engine cruft remains in their JSX.
3. Tests:
   - `tests/modules/imports/imports-client.test.tsx` — replace engine hook mocks with primitive-tree-aware mocks. Assertions target new DOM (e.g. role="button", text content).
4. Final grep: `grep -rn "@/modules/shared/engines/list-view\|@/modules/shared/engines/record-view/sections\|@/modules/shared/engines/record-view/panel\|@/modules/shared/engines/record-view/forms\|@/modules/shared/engines/common/display\|@/modules/shared/engines/common/feedback" apps/web/modules/imports/` — should return zero matches.
5. Allowed remaining engine imports in imports module (the "stays" list): exhaustively listed in §1.3, no more.

**Acceptance:**
- All three pages (`/dashboard/imports`, `/dashboard/imports/new`, `/dashboard/imports/[id]`) render and operate identically to pre-migration.
- `bun test` green.
- `tsc --noEmit` clean.
- The grep above returns nothing outside the explicit "stays" list.
- Smoke pages still work (they're independent — deletion gate is the next sweep, per the file headers).

---

## 3 · Risks + open questions

1. **Multiline `TextCell`.** Notes field needs a textarea today (`RECORD_TEXTAREA_CONTROL_CLASS_NAME`). Confirm `TextCell` supports a `multiline` prop or add a `TextareaCell` primitive in Phase 1.
2. **Notices surface decision.** ActionHeader already has `error`; needs a complementary `message` (positive notice). Lightweight extension — but it's a primitive change, do it in Phase 1.
3. **Grouping deferral.** If the user wants grouping shipped in this sweep, Phase 1 grows: `Grid` either learns about groups, or `GroupTree` learns to render `Grid` rows.
- grouping is not needed for imports list view, grouping controls is part of a larger sweep
4. **Pagination hrefs.** SSR pagination needs hrefs on `PaginateControls`. Small primitive change in Phase 1.
- pagination needs to be present for the list and record view staged inventory section. 
5. **Mark-for-import worker route.** Confirms whether the worker job + dispatcher actually exists per memory note "sweep 4c done" before Phase 4. If not, scope creep.
- please anlayze the use case - api route - outbox - relay - worker - domain for the imports staged row worker job before we confirm execution for phase 1
6. **Test rewrite scope.** The existing test file mocks deep engine hooks (`useTableColumns`, `useServerTableQueryControls`). After migration those mocks point to dead code and assertions need full retargeting. Budget non-trivial test rewrite time in Phase 2 + Phase 5.
7. **Visual delta on "first-row labels."** Engine renders column labels above row 1 only inside the staged-rows section. New `Grid` has a real sticky header row — that's a small visual shift. Confirm acceptable before Phase 4.
8. **`buildDeleteConfirmationMessage`, `formatStableDate`, `buildRecordDetailHref`, `resolveRecordEntryReturnTo`.** Small helpers; either keep importing from `engines/common/` (allowed — they're not list-view or record-view specific) or duplicate locally. Recommend: keep.

**we shouuld extract controllers into the web/controllers directory before migration so imports can fully be governed by the new primitives**
**we are not deleting anything from the current shared/engines directory**

---

## 4 · Out of scope (explicit)

- Inventory module migration. Stays on engine.
- Cut logs module migration. Stays on engine.
- Engine refactoring or deletion. Engine stays put for every other consumer.
- Smoke-page deletion. The smoke routes are flagged for deletion before the *next* sweep, not this one — leave them alive for the duration of this sweep so we can A/B against the real module while migrating.
- Domain shape changes. `ImportRow`, `ImportDetail`, `StagedInventoryRow`, `ImportPrimaryForm` all stay as-is; sweep 4e shape is what we target.
