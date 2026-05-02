# UI Sweep — Pending Cut Logs Row-Level Inline Triggers

**Status:** Draft (awaiting approval)
**Date:** 2026-05-01
**Predecessor sweep:** `sessions/plan-2026-05-01-pending-cut-logs-sync.md` + `sessions/execution-2026-05-01-pending-cut-logs-sync.md` (Phases 0–6: schema → domain → data → application → worker dismantle → API + validators).

---

## Context

Backend rebuild for pending cut logs is complete. Three sync use cases (`createPendingCutLogUseCase`, `updatePendingCutLogUseCase`, `deletePendingCutLogUseCase`) are wired through three new API routes; the void use case is relocated to `POST /cut-logs/[cutLogId]/void`; the producer/consumer worker pair, relay dispatcher, queue, topic, and `SAVING_CUTS` enum are gone. The audit just run shows every layer respecting boundaries; finalize + void flows have 5 hardening candidates (refinements, not bugs) deferred to a future sweep.

This sweep replaces the section-wide "Save Pending Cuts" / "Discard Pending Cuts" buttons with **row-level inline triggers**. Each row commits independently via the new sync routes. The finalize batch UI stays in place; finalize hardening (incl. speedy-refresh) is a separate sweep.

By the end of this sweep, `apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts` is gone, the diff client helper `saveWorkOrderItemPendingCutLogDiffRequest` is gone, and the diff types in `@builders/application` are gone. The remaining red typecheck error from the previous sweep (`case "SAVING_CUTS":` at `work-order-material-items-section.tsx:44`) is resolved as part of the section-component rewrite.

---

## Locked decisions

1. **Row editing — auto-discard on click-off + disabled-till-dirty trigger.** Section tracks `editingRowId`. When it changes, the previous row is reset to its server snapshot. Trigger button (the circular commit checkbox) is disabled when the row is pristine; enabled when dirty.
2. **Single destructive action button per row → confirmation dialog.** Dialog body is status-aware: "Delete cut log?" for PENDING; "Void cut log?" for FINAL. For VOID/QUEUED rows the button renders disabled with a tooltip. Column count is constant across statuses.
3. **Finalize reload deferred** to the finalize-hardening sweep. Per-row mutations get callback-driven speedy refresh in this sweep; finalize uses today's reconciliation as-is.
4. **Shared cut-log row primitive** at `@/components/features/cut-log-row/`. WO composes it with `editable: true`; inventory consumes it `editable: false`. Eliminates ~100 lines of cross-section duplication and aligns with [components/CLAUDE.md](apps/web/components/CLAUDE.md) "every primitive accepts editable" rule.

---

## User flow (canonical)

1. User expands a WOMI's cut-log section and clicks **Add Pending Cut** (one button per WOMI, inside that WOMI's expanded cut-log section) → a draft row is appended with location-dropdown focused.
2. User picks a location → inventory dropdown filters to that location only.
3. User picks inventory → cut + notes + isWaste become editable.
4. User clicks the **circular commit checkbox** in the row → fires `POST /cut-logs`. On success, the row patches in place from the response.
5. To edit a saved row, the user starts typing in any cell. The section sets `editingRowId` to that row. If another row was mid-edit, that row's local state resets to its server snapshot ("clicked off" → discard).
6. The circular commit re-arms when the row is dirty. Clicking it fires `PATCH /cut-logs/[cutLogId]` (with OCC via `mutation.expectedUpdatedAt`). Response patches the row.
7. Row's destructive action button: clicking it opens the dialog; confirm fires `DELETE /cut-logs/[cutLogId]` (pending) or `POST /cut-logs/[cutLogId]/void` (final). Disabled+tooltip for VOID/QUEUED.
8. Finalize batch is unchanged in this sweep: per-row square checkboxes + section-level "Finalize Selected" → `POST /cut-logs/finalize` (worker async).

---

## Where new code lives

| Layer | Path |
|---|---|
| Component primitives | `apps/web/components/{cells,badges,dialogs,features}/` |
| Generic controllers | `apps/web/controllers/record/` (only if a hook is genuinely cross-module) |
| WO-specific controllers | `apps/web/modules/work-orders/controllers/` |
| WO section + row components | `apps/web/modules/work-orders/components/record/material-items/` |
| WO client mutations | `apps/web/modules/work-orders/data/mutations.ts` |
| Inventory adopts shared primitives | `apps/web/modules/inventory/components/record/cut-logs/` + `…/sections/inventory-historical-cut-logs-section.tsx` |
| Application types cleanup | `packages/application/src/flooring/work-orders/cut-logs/types.ts` |

`modules/shared/` is not touched in this sweep. The cut-log code already imports directly from `@/components/panels/...` (audit confirmed) — phaseout is happening organically.

---

## File map

### NEW component primitives
- `apps/web/components/cells/circular-commit-button.tsx` — round commit checkbox (distinct from the square finalization checkbox already in use). Accepts `editable: boolean` (per components/CLAUDE.md), `disabled: boolean` (true when row is pristine), `pending: boolean` (spinner state during the in-flight mutation), `tone: "neutral" | "success"`. Returns to neutral after commit; success-flash on save is up to the caller via `pending`.
- `apps/web/components/badges/cut-log-status-badge.tsx` — status → tone mapping consolidated from inventory (`inventory-cut-logs-section.tsx:32–34`) + WO (`work-order-cut-log-row.tsx:37–50`). Renders "Pending Cut" / "Queued" / "Final Cut" / "Voided" via the existing `formatCutLogStatus` domain helper + tone map.
- `apps/web/components/features/cut-log-row/grid-layout.ts` — single source `CUT_LOG_GRID_COLUMNS` constant. Column set is identical across statuses (locked decision #2). Column widths/order are passed in via the layout consumer; the constant defines the canonical column keys + widths.
- `apps/web/components/features/cut-log-row/cut-log-row.tsx` — `<CutLogRow editable=... row=... slots=...>`. Renders the canonical column set. When `editable=false`, every cell is `editable={false}` (uses the existing cell primitives' built-in static-vs-input switch). When `editable=true`, the consumer (WO) passes editable cell renderers via slots for: inventory dropdown (with location pre-filter), cut value, isWaste toggle, notes. The row also renders the destructive action button + the circular commit (passed via slots so the consumer wires up onClick handlers from its row controller).
- `apps/web/components/features/cut-log-row/format-cut-log-timestamp.ts` — single source for ISO → display string. Replaces three duplicated copies (inventory + historical + WO inline).
- `apps/web/components/dialogs/cut-log-action-dialog.tsx` — confirm dialog with status-aware copy. Props: `status`, `cutLogNumber`, `onConfirm`, `pending: boolean`, `onClose`. Renders one of: delete confirm / void confirm / disabled-state shouldn't open dialog at all (the button is disabled).

### NEW WO controllers
- `apps/web/modules/work-orders/controllers/use-pending-cut-log-row.ts` — per-row state machine: `pristine | dirty | committing | error`. Owns the row's local snapshot (initialized from the server row), exposes `setField(key, value)`, `commit()`, `reset()`. `dirty` is computed from local-vs-server snapshot diff; `commit()` fires the right mutation (create for drafts, update for existing rows) and on success replaces the server snapshot. Used by `cut-log-row.tsx` consumers.
- `apps/web/modules/work-orders/controllers/use-pending-cut-log-section.ts` — section orchestration: holds the row list (drafts + server rows), tracks `editingRowId`, exposes `addDraft()`, `enterEditMode(rowId)` (which discards the previous editing row by calling its `reset()`), `removeDraft(localId)`, and the per-row controller factory. Replaces the deleted `use-work-order-cut-log-section-state.ts`.
- `apps/web/modules/work-orders/controllers/use-finalize-cut-log-batch-section.ts` — extract the finalize selection state currently inline in `work-order-material-items-section.tsx:93–108`. Wraps `useGatedBatchSelect`, exposes selection + fire. Done in this sweep so the section component stays small after the rewrite. Behavior unchanged.

### NEW client mutations (replace the diff helper in `mutations.ts`)
- `createPendingCutLogRequest({ workOrderId, workOrderItemId, inventoryId, cut, isWaste, notes })` → `POST /api/work-orders/${workOrderId}/cut-logs`. Wraps body in `withMutationMeta`. Returns `{ cutLog, inventoryId, totalCutSum }`.
- `updatePendingCutLogRequest({ workOrderId, cutLogId, workOrderItemId, expectedUpdatedAt, patch })` → `PATCH /api/work-orders/${workOrderId}/cut-logs/${cutLogId}`. Wraps body in `withMutationMeta(.., expectedUpdatedAt)`. Returns `{ cutLog, inventoryId, totalCutSum }`.
- `deletePendingCutLogRequest({ workOrderId, cutLogId, workOrderItemId, expectedUpdatedAt })` → `DELETE /api/work-orders/${workOrderId}/cut-logs/${cutLogId}`. Wraps body in `withMutationMeta(.., expectedUpdatedAt)`. Returns `{ deletedId, inventoryId, totalCutSum }`.
- DELETE `saveWorkOrderItemPendingCutLogDiffRequest` + the `SavePendingCutLogDiffResponse` type from this file.

### EDITED files
- `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` — REPLACED. New version composes `<CutLogRow>` (the shared primitive) with editable slots (inventory dropdown with location pre-filter, cut/isWaste/notes inputs, action button, circular commit). Per-row controller wires onClick → mutation → response patches local. Drops from ~470 lines to (estimated) ~200.
- `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` — EDIT. Remove "Save Pending Cuts" (line 330) and "Discard Pending Cuts" (line 320). **Keep "Add Pending Cut" where it is** — one button per WOMI, rendered inside each expanded WOMI's cut-log section (the existing per-WOMI placement is correct because each material item owns its own cut-log set). Extract finalize selection state into `useFinalizeCutLogBatchSection`. Remove the `case "SAVING_CUTS":` switch arm at line 44 (resolves the lone red typecheck from the previous sweep).
- `apps/web/modules/work-orders/data/mutations.ts` — EDIT. Add the three new helpers; remove the diff helper + response type. Cut log–related diff type imports from `@builders/application` go away.
- `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` — EDIT. Adopt `<CutLogRow editable={false}>` and the shared status badge / timestamp helpers. Drop the inline tone-map and inline timestamp formatter.
- `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` — EDIT. Same adoption.

### DELETED
- `apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts` (294 lines) — replaced by `use-pending-cut-log-section.ts` + `use-pending-cut-log-row.ts`.

### CLEANED UP carryovers
- `packages/application/src/flooring/work-orders/cut-logs/types.ts` — remove `WorkOrderCutLogPendingDraft`, `WorkOrderCutLogPendingUpdate`, `WorkOrderCutLogPendingDelete`, `WorkOrderCutLogPendingDiff`. Last consumers (the old controller + diff helper) go away in this sweep.
- The `case "SAVING_CUTS":` arm at `work-order-material-items-section.tsx:44` — gone with the section rewrite.

---

## Reconciliation pattern

**Per-row callback-driven** (matches the imports module's `useRecordScopedSectionController` style):

- Each mutation returns `{ cutLog, inventoryId, totalCutSum }` (or `{ deletedId, ... }` for delete).
- The row controller patches its server snapshot with the response.
- The section controller updates its `rows` array via the row callback.
- No React Query invalidation needed for the cut-log section — the section UI is fed by SSR initial data + local patching.
- For inventory `totalCutSum` consistency: the response includes the recomputed `totalCutSum`, so the inventory totals UI patches alongside the row.

**Material items section** stays sectional (already so). **Finalize batch** is unchanged. **Inventory primary** stays untouched.

---

## Sequence of work (suggested commit boundaries)

| # | Step | Commit boundary |
|---|---|---|
| 1 | Component primitives (circular commit, status badge, shared row layout, action dialog, timestamp formatter) | `components(cut-logs): primitives for row-level inline triggers` |
| 2 | WO controllers (per-row, section, finalize selection extract) | `controllers(work-orders): per-row pending cut-log controllers` |
| 3 | Client mutations (3 new + drop diff helper) | (combine with #2 OR own commit) |
| 4 | WO section + row components (replace, edit material-items section) | `ui(work-orders): row-level inline triggers replace section save/discard` |
| 5 | Inventory adoption of shared primitives | `ui(inventory): adopt shared cut-log row` |
| 6 | Cleanup (delete old controller, drop dangling app types) | `cleanup(cut-logs): drop diff types + old section controller` |
| 7 | Typecheck + grep gate + smoke | (no commit; verification step) |

---

## Out of scope (deferred sweeps)

- **Finalize hardening** — the 5 items from the previous audit (observability of `markWorkOrderItemsFailedFromFinalizeBatch`, void's raw-SQL lock vs finalize's helper, redundant predicates, defensive read reordering on void, dedup of producer+consumer finalizability validators).
- **Speedy refresh after finalize** — bundled with finalize hardening.
- **Material items section reload mechanism** — it's already sectional and not in user complaints.
- **Search-bar in dropdown** — explicitly later sweep; existing `SearchDropdown` substring match stays.
- **Inline cell filtering before product selection** (category filter) — later sweep.
- **List view grouping / filtering / search** — later sweep.

---

## Verification

- `pnpm typecheck` clean across `@builders/domain`, `@builders/db`, `@builders/application`, `apps/web`, `apps/worker`, `apps/relay`. (Both apps/web errors from the previous sweep — section route TS2305 + `case "SAVING_CUTS":` — are resolved in this sweep.)
- Grep gate: zero source matches for `saveWorkOrderItemPendingCutLogDiffRequest`, `useWorkOrderCutLogSectionState`, `WorkOrderCutLogPendingDiff`, `WorkOrderCutLogPendingDraft`, `WorkOrderCutLogPendingUpdate`, `WorkOrderCutLogPendingDelete`, `case "SAVING_CUTS":`.
- Manual smoke (single WO, expanded WOMI):
  - Add Pending Cut → location filter → inventory dropdown narrows → fill cut/notes → circular commit → row patches in place; `totalCutSum` UI reflects new total.
  - Edit a saved row → start typing in another row mid-edit → first row resets to server snapshot (no commit fired).
  - Click destructive button → dialog opens with "Delete cut log?" copy → confirm → row removes; `totalCutSum` updates.
  - Finalize a row (via existing batch UI) → row's destructive button now reads "Void cut log?" → dialog confirm → row patches to VOID status.
  - Try to delete a final row → button disabled with tooltip.
- Manual smoke (inventory): cut-log section renders with the new shared row; status badges + timestamps look identical to before.
- 409 `WORK_ORDER_CUT_LOG_STALE` path: open the same row in two tabs, edit + commit in tab 1, then commit in tab 2 → tab 2 surfaces the stale error in the row controller's `error` state (toast or inline message).

---

## Open questions for execution

1. `Grid<TRow>` control-column slot — does the existing primitive expose a slot for the circular-commit-button column? (If not, add one in step 1.) Will check at start of execution.
2. Naming — `use-pending-cut-log-{section,row}.ts` is shorter than `use-work-order-pending-cut-log-{section,row}.ts`. Path already encodes "work-orders" (`apps/web/modules/work-orders/controllers/`). Going with the shorter name unless flagged.
3. Where do the new row controller's error states surface (toast vs inline)? Defaulting to inline next to the commit button (matches the auto-discard model — error stays attached to the row, doesn't block the section). Will revisit if the inline UI feels cramped.

## Decided during plan review

- **"Add Pending Cut" placement** — stays in its current per-WOMI position (inside each expanded WOMI's cut-log section), not promoted to a section-wide header. Rationale: each material item owns its own cut-log set; one button per WOMI is the right scope.
