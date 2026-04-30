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
| 1a | `engines/common/application/` → `apps/web/server/telemetry/` (+ shims) | ⬜ | |
| 1b | Verify `@/transport/*` engine shims still in place (no work) | ⬜ | |
| 1c | `engines/common/record-entry/` → `apps/web/hooks/navigation/` | ⬜ | |
| 1c | `engines/record-view/client/hooks/` → `apps/web/hooks/record/` | ⬜ | |
| 1c | `engines/common/feedback/{confirm-delete,notices,feedback-states}` → respective canonical dirs | ⬜ | |
| 1d | `engines/record-view/client/controllers/` → `apps/web/controllers/record/` | ⬜ | |
| 1d | `engines/record-view/client/utils/` → `controllers/record/utils/` | ⬜ | |
| 1e | `engines/record-view/client/scaffolds/` → `apps/web/scaffolds/` | ⬜ | |
| 1e | `engines/record-view/shell/{detail-page-shell,primary-header,action-buttons,panel-footer,index}` → split scaffolds/components | ⬜ | |
| 1e | DROP: `shell/{primary-record-panel,record-options-menu,record-panel-width}` | ⬜ | inline `max-w-none` constants at move time |
| 1e | `engines/record-view/panel/` → `apps/web/components/panels/` | ⬜ | |
| 1e | `engines/record-view/sections/{panels,metrics,structure}/` → `apps/web/components/sections/*` | ⬜ | |
| 1e | `engines/record-view/shell/record-primary-fields.tsx` → `components/sections/structure/` (as-is) | ⬜ | |
| 1e | `engines/record-view/feedback/` → `apps/web/components/feedback/{errors,notices}/` | ⬜ | |
| 1f | `modules/shared/property-fields/` → `apps/web/components/composites/property-fields/` | ⬜ | |
| 1g | Extend `useServerListController` with filter state + URL binding | ⬜ | |
| 1g | Build `apps/web/components/features/filter/` (FilterControl + chip strip) | ⬜ | API: `filters`, `onFilterChange`, `filterableFields` |
| 1g | Extend `listX(...)` request types with `filters` for templates + WO | ⬜ | reference: imports module |

**Phase 1 acceptance check:** ⬜ `tsc --noEmit` passes · ⬜ engine paths still resolve via shims · ⬜ no module yet imports from new peer dirs

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
