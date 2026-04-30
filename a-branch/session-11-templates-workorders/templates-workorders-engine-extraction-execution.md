# Execution — Templates + Work Orders Engine Extraction

> Plan: [`templates-workorders-engine-extraction-plan.md`](./templates-workorders-engine-extraction-plan.md) (locked 2026-04-29)
> This file tracks per-phase execution status, deviations, and residual-grep evidence.

## Status Legend
- ⬜ not started
- 🟡 in progress
- ✅ done
- ⚠️ deviated from plan (see notes)
- ⏸ blocked

---

## Phase 1 — Extract Engine Concerns to New Peer Dirs

| Sub | Description | Status | Notes |
|---|---|---|---|
| 1a | `engines/common/application/` → `apps/web/server/telemetry/` (+ shims) | ✅ | 4 files moved (loader-timing, mutation-telemetry, run-use-case, with-transaction). Engine files converted to one-line re-export shims. 49 consumers untouched. `npm run typecheck` green. |
| 1b | Verify `@/transport/*` engine shims still in place (no work) | ⚠️✅ | Plan said "no work" but engine transport files were **duplicates** of canonical, not shims. Converted all three (`http.ts`, `mutation.ts`, `client-errors.ts`) to one-line re-exports pointing at `@/transport/*`. 13 module consumers + 2 engine internal references untouched. typecheck green. Phase 4a deletion now mechanical. |
| 1c | `engines/common/record-entry/` → `apps/web/hooks/navigation/` | ✅ | `routes.ts` + `use-record-entry-navigation.ts` + `index.ts` barrel. Engine `record-entry/index.ts` left as-is (already a barrel; transparently routes through the now-shimmed sibling files). 36 consumers untouched. |
| 1c | `engines/record-view/client/hooks/` → `apps/web/hooks/record/` | ✅ | All 5 hooks (pending-workflow-polling, record-close-guard, record-dirty-state, record-notices, record-section-workflow). `use-record-close-guard` keeps engine import for `useUnsavedChangesGuard` (in `engines/common/navigation/`, not in scope this sub-phase). `use-record-section-workflow` retargets `../../contracts` to `@/modules/shared/engines/record-view/contracts` (contracts/ migration is a future sub-phase). 6 consumers untouched. |
| 1c | `engines/common/feedback/{confirm-delete,notices,feedback-states}` → respective canonical dirs | ⚠️✅ | `notices` + `feedback-states` extracted to `apps/web/components/feedback/{notices,states}/` with per-primitive split (matches `components/cells/` convention). `confirm-delete` extracted to `apps/web/components/dialogs/confirm-delete.ts` per plan, but flagged: it's pure helpers (`window.confirm` wrapper), not a primitive — slated for replacement by `<ConfirmDialog>` migration in a later sweep, then deletion. `status-pill.tsx` NOT extracted (out of scope per plan; merges to `components/badges/` separately). 20 consumers untouched. |
| 1d | `engines/record-view/client/controllers/` → `apps/web/controllers/record/` | ✅ | 7 controllers extracted: `useBatchSelectAction`, `useRecordDetailController`, `useRecordPageController`, `useRecordSectionController`, `useRecordScopedSectionController`, `useSingleSectionCreateController`, `useSingleSectionRecordController`. Internal sibling imports preserved (no path changes). External imports retargeted: `../hooks/*` → `@/hooks/record/*`, `../utils/*` → `./utils/*`. Cross-engine deps (`../../contracts`, `../scaffolds/record-detail-client-scaffold`) point at `@/modules/shared/engines/record-view/{contracts,client/scaffolds/record-detail-client-scaffold}` — those move in 1e. |
| 1d | `engines/record-view/client/utils/` → `controllers/record/utils/` | ✅ | 4 helpers extracted: `confirm-record-action`, `record-detail-cache`, `record-row-ids`, `record-section-drafts`. Pure helpers, no internal deps. Subfolder kept (per plan's preferred option) since multiple controllers share these. |
| 1d | `apps/web/controllers/CLAUDE.md` updated | ✅ | Registered `record/` as third bucket. Removed stale "engine hooks stay in engines/" sentence. Added split rationale: `controllers/` = feature state, `hooks/` = lifecycle plumbing. |
| 1e | `engines/record-view/client/scaffolds/` → `apps/web/scaffolds/` | ✅ | 2 scaffolds (`record-create-client-scaffold`, `record-detail-client-scaffold`) extracted. Shimmed at engine path. `RecordDetailClientScaffold` retargeted import to `@/scaffolds/record-detail-page-shell`. |
| 1e | `engines/record-view/shell/{detail-page-shell,primary-header,action-buttons,panel-footer}` → split scaffolds/components | ✅ | Page-level pieces (`record-detail-page-shell`, `record-primary-header`) → `@/scaffolds/`. Button/footer (`record-action-buttons`, `record-panel-footer`) → `@/components/panels/`. `RECORD_DETAIL_PANEL_WIDTH_CLASS = "max-w-none"` inlined into `record-detail-page-shell`. `record-panel-footer` retargeted `confirmRecordDelete` to `@/components/dialogs/confirm-delete`. |
| 1e | DROP: `shell/{primary-record-panel,record-options-menu,record-panel-width}` | ✅ | All 3 deleted via `rm`. Verified zero module consumers (only self + shell barrel referenced). `shell/index.ts` updated to remove their exports. |
| 1e | `engines/record-view/panel/` → `apps/web/components/panels/` | ✅ | All 3 files (`record-panel-config`, `record-panel-renderer`, `record-multi-section-panel`) extracted with imports retargeted to `@/scaffolds/`, `@/hooks/record/`, `@/controllers/record/`, `@/components/sections/structure/`, `@/components/sections/metrics/`, `@/components/feedback/notices/`. `apps/web/components/panels/index.ts` barrel created. |
| 1e | `engines/record-view/sections/{panels,metrics,structure}/` → `apps/web/components/sections/*` | ✅ | 17 files extracted across 3 subdirs. Cross-engine deps preserved at engine paths: contracts/, list-view/table/table-shell, sections/{cells,rows,status}/. `record-section-shell` keeps `TableBleed` from list-view engine. `record-item-section-controls` keeps cell + row imports from engine. `record-calculation-section` keeps `RecordSectionGrid`/`RecordGridColumnSpec` from engine rows/. `record-section-sub-header` keeps action-panel + status-indicators from engine status/. |
| 1e | `engines/record-view/shell/record-primary-fields.tsx` → `components/sections/structure/` (as-is) | ✅ | Extracted as-is per Decision 8. Same 5 exports (`RecordPrimarySection`, `RecordPrimaryPane`, `RecordPrimaryFieldsGrid`, `RecordPrimaryFieldCell`, `RecordStaticFieldValue`). No internal logic change. Engine shim re-exports. |
| 1e | `engines/record-view/feedback/` → `apps/web/components/feedback/{errors,notices}/` | ✅ | 5 files split by kind. Errors (3) → new `feedback/errors/` subdir + barrel. Notices (2: `record-form-notices` + `record-page-action-notices`) → existing `feedback/notices/` (1c) — barrel updated to expose all 6 notice exports. `record-field-errors` retargeted `RequestJsonError` import from engine common/transport to `@/transport/http`. |
| 1f | `modules/shared/property-fields/` → `apps/web/components/composites/property-fields/` | ✅ | `PropertyJoinedReadOnlyCells` (the only export — read-only address + instructions cells driven by the live property dropdown selection) extracted as-is. Already used canonical primitives (`CellAt`, `FormField`, `StaticFieldValue`) so no internal retargets needed. Engine `property-joined-readonly-cells.tsx` shimmed; engine `index.ts` barrel keeps re-exporting through the shim. New `apps/web/components/composites/` bucket established for cross-module domain UI compositions. 2 consumers (templates, work-orders) untouched — paths swap in 2b/3d. |
| 1g | Extend `useServerListController` with filter state + URL binding | ✅ | Both SSR + Fetch modes manage `Record<string, string[]>` filter state. New input: `filterableFields?: readonly string[]`. New output: `filters`, `onFilterChange(key, values)`, `onClearAllFilters()`. URL binding: each declared field becomes a multi-value query param (e.g. `?status=ready&status=draft`). Filters reset page to 1 on change and persist to TablePreferencePayload. `ListFilterValueMap` type added to controller-output contract. |
| 1g | Build `apps/web/components/features/filter/` (FilterControl + chip strip) | ✅ | New bucket with `contracts/filter-contract.ts`, `filter-control.tsx` (popover panel with grouped multi-value pill toggles + "Clear all" + per-field clear), `filter-chip-strip.tsx` (inline chips with X-to-remove), `index.ts` barrel. Pure controlled UI — `fields`, `values`, `onChange`, `onClearAll`. Wires straight to controller output. Modeled after engine `TableFilterControls` (will be deleted in Phase 4 once consumers migrate). |
| 1g | Extend `listX(...)` request types with `filters` for templates + WO | ✅ | **Application:** `listWorkOrdersUseCase` + `WorkOrdersListFilters` (`packages/application/src/flooring/work-orders/list-work-orders.ts`); `listTemplatesUseCase` + `TemplatesListFilters` (`packages/application/src/management/templates/list-templates.ts`). Mirror imports use case pattern; return `{ rows, total }`. Filter shape starts as `Record<string, never>` — concrete dimensions wire in WO/templates sweeps. **DB:** `WorkOrdersListArgs` + `TemplatesListArgs` extended with `filters?: Record<string, string[]>`; count args mirror it. WHERE builders accept the param and ignore (eslint-disabled `_filters`); concrete dimensions wired alongside UI in module sweeps. **Module:** WO HTTP wrapper (`list-work-orders-request.ts`) reads/writes filter URL params via `WORK_ORDERS_LIST_FILTERABLE_FIELDS` const (currently empty). Templates HTTP wrapper deferred to Phase 3a (templates list isn't on `useServerListController` yet). |

**Phase 1 acceptance check:** ✅ `tsc --noEmit` passes · ✅ engine paths still resolve via shims · ✅ no module yet imports from new peer dirs (consumers swap in Phase 2b/3d)

---

## Phase 2 — Sweep Work-Orders Consumers

| Sub | Description | Status | Notes |
|---|---|---|---|
| 2a | Replace WO MI hand-rolled table with `Grid` + canonical cells + `useSingleSectionRecordController` | ⬜ | preserve visual density |
| 2a | Add expandable-row for cut logs (use `components/grid/expandable-rows/`) | ⬜ | reference: `webb/app/components-smoke` |
| 2a | Wire pending cut log save + finalize cut log use cases | ⬜ | layered Domain → Data → Application → API → worker |
| 2a | **Verify save now refreshes section** (original bug) | ⬜ | acceptance gate |
| 2b | Path swaps: scaffolds, panels, sections, feedback, primary-fields | ⬜ | |
| 2b | Path swaps: hooks/navigation, hooks/record, server/telemetry, dialogs/confirm-delete, transport | ⬜ | |
| 2c | Add Files section (third section in WO record view) | ⬜ | bucket-stored; uses `RecordItemSection` |
| 2c | Wire app-shell template-sync icon (create WO from template) | ⬜ | top-right; canonical use-case path |

**Phase 2 acceptance check:** ⬜ `rg "modules/shared/engines" apps/web/modules/work-orders` returns zero · ⬜ end-to-end smoke (see plan §Verification §Phase 2)

---

## Phase 3 — Sweep Templates Consumers

| Sub | Description | Status | Notes |
|---|---|---|---|
| 3a | Swap `useConfiguredTableState` + `useTableControls` for `useServerListController` (fetch mode) | ⬜ | |
| 3a | Drop grouping UI entirely | ⬜ | per Decision 4 |
| 3a | Wire server-side filter (from Phase 1g) | ⬜ | |
| 3a | Add `listTemplatesRequest` (paginated + filterable) | ⬜ | |
| 3a | Remove `disableClientPagination: true` paths | ⬜ | |
| 3b | Rewrite `TemplatePrimaryFieldsSection` to use `components/fields/` + `components/cells/` | ⬜ | mirror WO primary |
| 3b | Keep `RecordPrimarySectionInstance` wrapper | ⬜ | still canonical |
| 3c | Templates MI: import path swaps (panels, sections, feedback, primary-fields, scaffolds) | ⬜ | |
| 3d | Remaining tree-wide path swaps (mirror 2b) | ⬜ | |

**Phase 3 acceptance check:** ⬜ `rg "modules/shared/engines" apps/web/modules/templates` returns zero · ⬜ `rg "engines/record-view/forms" apps/web` returns zero outside engine tree · ⬜ end-to-end smoke (see plan §Verification §Phase 3)

---

## Phase 4 — Residual Grep + Engine Deletion

Per-file deletion requires a residual-grep proof.

| Sub | Target | Status | Grep result | Notes |
|---|---|---|---|---|
| 4a | `engines/common/transport/*` | ⬜ | _pending_ | |
| 4a | `engines/common/application/*` | ⬜ | _pending_ | |
| 4b | `shell/primary-record-panel.ts` | ⬜ | _pending_ | already dropped 1e |
| 4b | `shell/record-options-menu.tsx` | ⬜ | _pending_ | already dropped 1e |
| 4b | `shell/record-panel-width.ts` | ⬜ | _pending_ | already dropped 1e |
| 4c | `engines/record-view/forms/` | ⬜ | _pending_ | only blocker is templates pre-Phase 3b |
| 4d | `list-view/scaffold/` | ⬜ | _pending_ | check non-templates+WO consumers |
| 4d | `list-view/controls/` | ⬜ | _pending_ | check non-templates+WO consumers |
| 4d | `list-view/table/` | ⬜ | _pending_ | many residual consumers expected — track |
| 4d | `useTableControls` (heavy) | ⬜ | _pending_ | likely residual debt |
| 4d | `useConfiguredTableState` | ⬜ | _pending_ | likely residual debt |
| 4e | `engines/record-view/{panel,sections,feedback,client,shell}` shims | ⬜ | _pending_ | resolve to deletes when whole-repo grep is zero |
| 4f | `modules/shared/property-fields/` | ⬜ | _pending_ | |

**Residual debt list (engine files NOT deleted because of non-templates/WO consumers):**
_To be filled in during Phase 4. Each entry: `path | consumer modules | next sweep that should clear it`._

**Phase 4 acceptance check:** ⬜ per-file grep output captured · ⬜ `tsc --noEmit` after each batch · ⬜ residual debt list documented

---

## Deviations from Plan

_If anything departs from the locked plan during execution, log it here with rationale. If a `cleanup.md` is needed, it gets created alongside this file (per CLAUDE.md workflow)._

| Date | Phase/Sub | Deviation | Why |
|---|---|---|---|
| _none yet_ | | | |

---

## Headlines / Error Counts (per CLAUDE.md)

_Update at the end of each phase. Paste in chat too._

- **Phase 1**: _pending_
- **Phase 2**: _pending_
- **Phase 3**: _pending_
- **Phase 4**: _pending_
