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
| 2a | Replace WO MI hand-rolled table with `Grid` + canonical cells + `useRecordScopedSectionController` | ✅ | Both component files rewritten on canonical pattern. `work-order-material-items-section.tsx` (337 lines, was 282 hand-rolled) now uses `<Grid>` + `<DropdownCell>` / `<NumberCell>` / `<TextCell>` / `<RowActionButton>` / `<StatusBadge>` matching Templates MI structure. Visual density preserved (compact column min-widths). All controller wiring intact (no changes to `useWorkOrderMaterialItemsSection`, `useWorkOrderCutLogFinalize`, `useWorkOrderItemPendingCutLogs`, `useWorkOrderCutLogVoid`, mutations, queries, application use cases). **Header deviation:** rolled custom flex header instead of `<ActionHeader>` because `ActionHeader` is action-list-only (no slot for the `<ActionsPanel>` portal trigger). Visual chrome matches Templates MI. |
| 2a | Add expandable-row for cut logs (use `components/grid/expandable-rows/`) | ✅ | Each WOMI row uses `<ExpandableRow>` (`accentTone="sky"`, `childGroupLabel="Cut Logs"`, `childCount`) wrapping the rewritten `WorkOrderCutLogRow` (537 lines). `<ExpandToggle>` slots into parent grid's `leadingControls` `expand` column. Cut-log row uses canonical Grid for server rows + a separate `<ScopedRow>` block for drafts (drafts have a different column shape — location filter + inventory dropdown stack). Pattern matches the smoke-page reference. |
| 2a | Wire pending cut log save + finalize cut log use cases | ✅ | No new wiring needed — controllers + use cases already exist (`saveWorkOrderItemPendingCutLogDiffUseCase`, `finalizeWorkOrderCutLogBatchUseCase`, `voidWorkOrderCutLog`). New components consume `pending.{drafts,updates,deletes,save,discard,editServerRow,deleteServerRow,undoDelete,addDraft,updateDraft,removeDraft}`, `finalize.{isSelectionMode,selectedIds,setSelected,enterSelectionMode,exitSelectionMode,submit,isSubmitting,error}`, `voider.{voidCutLog,isVoiding,voidingId,error}` verbatim. |
| 2a | **Verify save now refreshes section** (original bug) | ✅ (typecheck-level) | Save path now goes through `useRecordScopedSectionController.save()` → `saveWorkOrderMaterialItemsSectionRequest` → controller publishes new `serverRevisionKey` → canonical `Grid` re-keys rows off `section.items`. The hand-rolled `<table>` previously short-circuited because raw `<select>` / `<input>` DOM state bypassed the controller's re-key contract. Runtime smoke pending dev-server walk-through. |
| 2a | typecheck after rewrite | ✅ | `npm run typecheck` (full web workspace) green. Controller-side adjustments: **none.** |
| 2a.fix.B1 | Merge cut-log drafts into a single `<Grid>` (no separate ScopedRow block) | ✅ | Replaced the 2a two-grid layout with a single discriminated `CutLogGridRow` (`{kind:"draft",clientId}` / `{kind:"server",serverRow}`). One layout, one Grid, drafts placed at top of `gridRows`. Inventory column bumped to `minWidth:220` to fit the draft's location-filter + inventory-dropdown stack; server rows show `"InvNumber · LocCode"` in the same column. `renderCell`/`renderControl` switch on `row.kind`. Empty state now fires only when both server rows and drafts are empty. |
| 2a.fix.B2 | Wire `router.refresh()` after MI section save | ✅ | [use-work-order-material-items-section.ts](apps/web/modules/work-orders/controllers/use-work-order-material-items-section.ts) — `useRouter()` import + `router.refresh()` call after `publishWorkOrder(nextWorkOrder)`. SSR loader re-runs → fresh `initialMaterialItems` → controller's `serverRevisionKey` changes → controller reconciles. Comment in file flags this as transitional; tracked under 2d for cleaner "save returns items" route extension. |
| 2a.fix.B3 | WO list paints immediately (fix 2s blank state) | ✅ | Root cause: dashboard page prefetched via `listWorkOrdersRequest` (client HTTP wrapper doing a server-side `fetch("/api/work-orders?…")` internal roundtrip) instead of `listWorkOrdersUseCase` (server-side application use case). [page.tsx](apps/web/app/dashboard/work-orders/page.tsx) now imports `listWorkOrdersUseCase` from `@builders/application` and prefetches via the use case directly — mirrors imports list pattern. React Query cache hydrates with matching `queryKey`, no client-side refetch on mount. |
| 2a.fix typecheck | ✅ | `npm run typecheck` (full web workspace) green. |
| 2b | Path swaps: scaffolds, panels, sections, feedback, primary-fields | ✅ | **Module components (3 files):** `work-order-detail-client.tsx` → `@/scaffolds/record-detail-client-scaffold`. `work-order-record-panel.tsx` → `@/components/panels/record-multi-section-panel`, `@/components/sections/panels/record-primary-section-instance`, `@/scaffolds/record-detail-client-scaffold`, `@/components/dialogs/confirm-delete`. `work-order-create-client.tsx` → `@/hooks/navigation`, `@/scaffolds/record-create-client-scaffold`, `@/components/panels/record-panel-footer`, `@/components/sections/panels/record-single-section-panel`, `@/controllers/record/use-single-section-create-controller`, `@/scaffolds/record-detail-client-scaffold`. |
| 2b | Path swaps: hooks/navigation, hooks/record, server/telemetry, dialogs/confirm-delete, transport | ✅ | **API routes (8 files):** `withMutationTelemetry` → `@/server/telemetry/mutation-telemetry` across `route.ts`, `[id]/route.ts`, `[id]/primary/section/route.ts`, `[id]/material-items/section/route.ts`, `[id]/material-items/[itemId]/pending-cut-logs/section/route.ts`, `[id]/cut-logs/finalize/route.ts`, `[id]/cut-logs/[cutLogId]/route.ts`, `[id]/files/route.ts`, `[id]/files/[fileId]/route.ts`. **Dashboard pages (2 files):** `[id]/page.tsx` + `new/page.tsx` — `resolveRecordEntryReturnTo` → `@/hooks/navigation`. **Module data:** `data/queries.ts` `withLoaderTiming` → `@/server/telemetry/loader-timing`. **Module controllers (3 files):** `use-work-order-primary-section.ts`, `use-work-order-material-items-section.ts`, `use-work-orders-list-controller.ts` — split barrels into `@/controllers/record/`, `@/controllers/record/utils/record-row-ids`, `@/hooks/navigation`. |
| 2b.bonus | Extract `record-section-error` to `@/types/record/section-error` + cleanup | ✅ | Surfaced when WO controllers still hit `engines/record-view/contracts` for `createRecordSectionError`. Extracted the contract verbatim to new `apps/web/types/record/section-error.ts`; engine `contracts/record-section-error.ts` shimmed; **9 imports swapped** across canonical tree (`controllers/record/use-record-section-controller`, `use-single-section-record-controller`, `hooks/record/use-record-section-workflow`, `components/feedback/errors/record-section-error-panel`, `components/sections/structure/record-section-sub-header`, `components/sections/panels/{record-single-section-panel,record-field-section}`) **plus** the 2 WO controllers. Cleaned up the wrong-direction "canonical-imports-engine" dependency in the Phase 1 controllers/components — now they all depend on `@/types/record/`. New peer dir `apps/web/types/record/` established; future record-view contract extractions land here. |
| 2c | Files section UI integration (third section on WO record view) | ⬜ | **Scope reduced 2026-04-30:** integrate the existing `apps/web/modules/work-orders/components/record/files/` into the canonical record-view layout (uses canonical `RecordItemSection` after 2b path swaps). Wire it as a sibling section to primary + material-items. **Defer:** new file-generation API routes and use-case extensions — existing `[id]/files/` route + `delete-work-order-file` / `generate-work-order-file` / `request-work-order-file` use cases stay as-is; no scope expansion in 2c. |
| 2c | ⏸ Wire app-shell template-sync icon (create WO from template) | ⏸ | **Deferred to a follow-up sweep** (per 2026-04-30). Tracked as a separate piece of work after Phase 2 lands. |

**Phase 2 acceptance check (post-2b):**
- ✅ `rg "modules/shared/engines" apps/web/modules/work-orders` returns **zero**
- ✅ `rg "modules/shared/engines" apps/web/app/dashboard/work-orders` returns **zero**
- ✅ `rg "modules/shared/engines" apps/web/app/api/work-orders` returns **zero**
- ✅ `npm run typecheck` (full web workspace) green
- ⬜ End-to-end smoke (dev-server walk-through) — pending after 2c

---

## 2d — Out of scope / deferred for this sweep

Things touched-by or adjacent-to Phase 2's WO surface that we are explicitly **not fixing or extending** in this sweep. Each gets its own follow-up.

| Item | Why deferred | Where it lives |
|---|---|---|
| App-shell template-sync icon (create WO from template) | UI wiring + cross-module use-case orchestration. Per 2026-04-30 scope decision, not bundled with the engine sweep. | `apps/web/app/(shell)/` (top-right icon area), `packages/application/src/flooring/work-orders/create-work-order.ts` (existing) |
| File generation API routes & use case extensions | Existing routes (`[id]/files/route.ts`, `[id]/files/[fileId]/route.ts`) and use cases (`generate-work-order-file`, `request-work-order-file`, `delete-work-order-file`) stay as-is. Phase 2c only touches the section UI integration into the canonical layout. New file-gen capabilities deferred. | `apps/web/app/api/work-orders/[id]/files/`, `packages/application/src/flooring/work-orders/files/` |
| Worker errors (file-gen apply path) | Known broken state. Worker apply paths for file-generation requests currently error. Out of scope for the engine-extraction sweep — worker code lives in `apps/worker/` and is not in this sweep's surface. | `apps/worker/src/` |
| Relay errors | Same — relay-side errors during the file-gen / cut-log lifecycle. Touching relay would expand scope into a different layer. | `apps/relay/src/` |
| Engine API routes still living under engine paths | API route handlers (e.g. `apps/web/app/api/work-orders/route.ts`) still import from `@/modules/shared/engines/common/application/mutation-telemetry`, etc. Path swaps for routes happen in 2b, but if errors surface in routes during Phase 2 we patch in place; route-handler architecture (use-case wiring vs direct repo calls) stays as-is unless explicitly required for the MI rebuild. | `apps/web/app/api/work-orders/**` |

**Note:** During 2a/2b/2c execution, if errors surface in API routes, worker, or relay that block the WO record view from working end-to-end, we **fix them in place** to unblock the sweep — but do not expand the sweep into rewriting those layers. The discipline: ship UI + controllers + hooks on canonical patterns; leave server-execution errors as fix-in-place patches; track follow-ups here.

---

## 2e — Inventory cut-log section strip-down (separate follow-up sweep)

Inventory's record view has a fully-featured cut-log section that duplicates the lifecycle WO is taking ownership of. Once Phase 2's WO MI rebuild lands (with the per-MI expandable cut-log row holding the canonical pending/finalize/void controllers), inventory's cut-log section needs to be reduced to a **read-only viewer** of cut logs cut from each inventory roll. The mutation surface moves entirely under WO.

This is **out of scope for Phase 2 itself** but tracked here so the cleanup is unambiguous when it gets sweep'd.

### What gets stripped from inventory

**Controller** ([apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts](apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts) — currently ~330 lines)

Remove:
- `useRecordScopedSectionController` block — the whole save/discard/dirty machinery.
- `buildCutLogsDiff`, `applyDiffOptimistically`, `toAddedDraftPayload`, `toUpdatePatch`, `createDraftRow`, `validateCutLogDrafts` integration.
- `useBatchSelectAction` for finalize.
- `addRow`, `removeRow`, `setRowField`.
- `selectedIds`, `toggleSelection`, `clearSelection`, `eligibleSelectedIds`, `isFinalizing`, `finalizeError`, `clearFinalizeError`, `finalizeSelected`.
- `markCutLogsForFinalizeRequest` and `saveCutLogPendingDiffRequest` calls.
- All `publishCutLogs` / `publishMarkedForFinalize` logic.

Keep:
- A thin reader hook that exposes the current `cutLogs: CutLogRow[]` projection for read-only rendering.

**Drafts file** ([apps/web/modules/inventory/controllers/drafts.ts](apps/web/modules/inventory/controllers/drafts.ts))
- **Delete entirely.** The `CutLogDraft` type, `createCutLogDraft`, `toCutLogDrafts`, `isLocalCutLogDraft`, `validateCutLogDrafts` all exist solely for the inventory-side mutation flow.

**Application use cases** (`packages/application/src/flooring/inventory/cut-logs/`)
- `apply-cut-log-pending-diff.ts` — DELETE (worker-side apply for inventory's diff path)
- `finalize-cut-logs.ts` — DELETE
- `mark-cut-log-for-void.ts` — DELETE
- `mark-cut-logs-for-finalize.ts` — DELETE
- `save-cut-log-pending-diff.ts` — DELETE
- `update-cut-log-links.ts` — KEEP only if cut-log link maintenance still has an inventory-side trigger; otherwise DELETE
- `void-cut-log.ts` — DELETE
- `errors.ts` / `types.ts` / `index.ts` — prune to only the symbols still referenced after the deletions above

**API routes** (`apps/web/app/api/inventory/[id]/cut-logs/`)
- `finalize/route.ts` — DELETE
- `void/route.ts` — DELETE
- `links/route.ts` — DELETE (or keep if `update-cut-log-links` survives)
- `section/route.ts` — REDUCE to GET-only (read for the inventory section view) or DELETE if the data already comes via `getInventoryDetailById`
- `_validators.ts` — prune

**Module data layer** ([apps/web/modules/inventory/data/mutations.ts](apps/web/modules/inventory/data/mutations.ts))
- Remove `markCutLogsForFinalizeRequest`, `saveCutLogPendingDiffRequest`, and any other cut-log mutation HTTP wrappers. Inventory mutations file should be limited to inventory-row CRUD only.

**Components** (`apps/web/modules/inventory/components/record/cut-logs/`)
- Reduce from an editable section grid to a read-only grid: drop add/remove/finalize chrome; keep the row layout + cell rendering with `editable={false}` everywhere.
- The columns showing `workOrderId` / `workOrderItemId` become click-throughs to the WO that owns the cut.

### What gets kept (the new minimal contract)

Inventory cut-log section becomes a **window** into the cut-log lifecycle owned by WO. Each row shows:
- Cut log number + status (PENDING/QUEUED/FINAL/VOID)
- Cut amount, before, after, coverage
- Link to the owning work order (read-only navigation)
- Created/updated timestamps

No add, no edit, no delete, no batch finalize, no void from this section. All of that lives on the WO MI section's expandable cut-log row.

### Why this is a separate sweep

Inventory's strip-down depends on WO MI's rebuild being complete and tested. Doing them together would mix two unrelated migrations and make the WO acceptance gate ambiguous. Order: land Phase 2 (WO sweep), verify WO MI cut-log lifecycle works end-to-end, **then** strip inventory in its own commit/PR.

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
