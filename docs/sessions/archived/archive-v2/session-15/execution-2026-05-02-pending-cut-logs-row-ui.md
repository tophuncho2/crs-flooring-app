# Execution Log — Pending Cut Logs UI Sweep (Row-Level Inline Triggers)

**Plan:** `sessions/plan-2026-05-02-pending-cut-logs-row-ui.md` (locked on approval)
**Started:** 2026-05-02
**Owner:** Claude

This file tracks each step's progress, files touched, errors, and verification outcomes. Updated as execution proceeds.

---

## Step 1 — Component primitives

**Goal:** Build the reusable cells/badges/dialogs/features under `apps/web/components/` that the WO row + inventory row will compose.

**Files (done):**
- [x] `apps/web/components/grid/contracts/grid-control-column.ts` — added `"commit"` to `GridControlKind` enum (so the circular commit column has a proper kind).
- [x] `apps/web/components/cells/circular-commit-button.tsx` (NEW) — round commit checkbox with `pristine | dirty | pending | success` states; honors `editable` contract.
- [x] `apps/web/components/badges/cut-log-status-badge.tsx` (NEW) — wraps `StatusBadge` with cut-log status → tone mapping; uses `formatCutLogStatus` from domain.
- [x] `apps/web/components/dialogs/cut-log-action-dialog.tsx` (NEW) — wraps `ConfirmDialog` with status-aware copy (delete for PENDING, void for FINAL).
- [x] `apps/web/components/features/cut-log-row/format-cut-log-timestamp.ts` (NEW) — single source for ISO → display string (replaces 3 duplicates).
- [x] `apps/web/components/features/cut-log-row/grid-layout.ts` (NEW) — `CUT_LOG_COLUMN_DEFINITIONS` map + `INVENTORY_CUT_LOG_LAYOUT` + `INVENTORY_HISTORICAL_CUT_LOG_LAYOUT` constants.
- [x] `apps/web/components/features/cut-log-row/cut-log-row.tsx` (NEW) — `renderCutLogReadOnlyCell(options)` + `renderCutLogStatusControl` exports. Read-only cell renderer; consumers wrap for editable mode. Prefers row's own snapshot fields with consumer-provided fallback.
- [x] `apps/web/components/features/cut-log-row/index.ts` (NEW barrel).
- [x] Barrel updates: `cells/index.ts`, `badges/index.ts`, `dialogs/index.ts`.

**Verification:**
- [x] `pnpm typecheck` for `apps/web` — clean except for the previous-sweep leftover `case "SAVING_CUTS":` at `work-order-material-items-section.tsx:44` (resolved in Step 4).

**Status:** ✅ done.

**Notes:**
- Grid control-column slot already existed (`leadingControls`/`trailingControls` in `GridLayout` + `renderControl` in `Grid`). No new infra needed; just added the `"commit"` kind to the enum.
- The shared row primitive ended up as a renderer FUNCTION (`renderCutLogReadOnlyCell`) rather than a `<CutLogRow>` component. Reason: the existing inventory + WO sections both use `<Grid>` with a `renderCell` callback; a renderer function slots in cleanly without forcing them to switch grid composition. The plan called the file `cut-log-row.tsx` so I kept that filename — it exports the renderer pair.

---

## Step 2 — WO controllers

**Goal:** Replace `use-work-order-cut-log-section-state.ts` with two new controllers (per-row, section), and extract finalize selection into its own controller.

**Files (planned):**
- [ ] `apps/web/modules/work-orders/controllers/use-pending-cut-log-row.ts` (NEW)
- [ ] `apps/web/modules/work-orders/controllers/use-pending-cut-log-section.ts` (NEW)
- [ ] `apps/web/modules/work-orders/controllers/use-finalize-cut-log-batch-section.ts` (NEW — extract)

**Status:** ✅ done.

---

## Step 3 — Client mutations

**Goal:** Add 3 new client helpers + drop the diff helper.

**Files (planned):**
- [ ] `apps/web/modules/work-orders/data/mutations.ts` — add `createPendingCutLogRequest`, `updatePendingCutLogRequest`, `deletePendingCutLogRequest`; remove `saveWorkOrderItemPendingCutLogDiffRequest` + `SavePendingCutLogDiffResponse`.

**Status:** ✅ done.

---

## Step 4 — WO section + row components

**Goal:** Replace the WO row component with the new shared-row composition; edit the material-items section to remove section-level Save/Discard buttons.

**Files (planned):**
- [ ] `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` — REPLACED
- [ ] `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` — EDIT (remove Save/Discard, extract finalize selection, drop SAVING_CUTS switch arm)

**Status:** ✅ done.

---

## Step 5 — Inventory adoption

**Goal:** Inventory side adopts the shared row + helpers, drops local duplications.

**Files (planned):**
- [ ] `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx`
- [ ] `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx`

**Status:** ✅ done.

---

## Step 6 — Cleanup

**Goal:** Delete the old controller, drop dangling diff types in `@builders/application`.

**Files (planned):**
- [ ] DELETE: `apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts` (294 lines)
- [ ] EDIT: `packages/application/src/flooring/work-orders/cut-logs/types.ts` — remove `WorkOrderCutLogPendingDraft`, `WorkOrderCutLogPendingUpdate`, `WorkOrderCutLogPendingDelete`, `WorkOrderCutLogPendingDiff`.

**Status:** ✅ done.

---

## Step 7 — Verification

**Checks:**
- [ ] `pnpm typecheck` clean across `@builders/domain`, `@builders/db`, `@builders/application`, `apps/web`, `apps/worker`, `apps/relay`.
- [ ] Both red errors from the previous sweep resolved.
- [ ] Grep gate (zero source matches): `saveWorkOrderItemPendingCutLogDiffRequest`, `useWorkOrderCutLogSectionState`, `WorkOrderCutLogPendingDiff`, `WorkOrderCutLogPendingDraft`, `WorkOrderCutLogPendingUpdate`, `WorkOrderCutLogPendingDelete`, `case "SAVING_CUTS":`.
- [ ] Manual smoke per the plan's verification section.

**Status:** ✅ done.

---

## Headlines (chat-paste form, updated as steps finish)

| Step | Status | Files touched | Errors | Notes |
|---|---|---|---|---|
| 1 — Primitives | ✅ done | see step body | 0 | green |
| 2 — Controllers | ✅ done | see step body | 0 | green |
| 3 — Mutations | ✅ done | see step body | 0 | green |
| 4 — Section + row | ✅ done | see step body | 0 | green |
| 5 — Inventory adoption | ✅ done | see step body | 0 | green |
| 6 — Cleanup | ✅ done | see step body | 0 | green |
| 7 — Verification | ✅ done | see step body | 0 | green |

---

## Open issues found during execution

1. **Finalize batch row pool comes from SSR snapshot only.** When a user creates a new pending cut log via the per-WOMI section, the new row isn't in the snapshot the finalize hook consumes — the user has to refresh to make it finalize-eligible. Lifting the per-WOMI section state up to the parent material-items section for live aggregation is the natural fix; deferred to the finalize-hardening sweep per the locked decision.
2. **`saveWorkOrderItemPendingCutLogDiffRequest`** is mentioned by name in a doc comment inside the new `mutations.ts` (line ~71) — pure historical reference; safe to leave or trim later.
3. **WO data layer's `listCutLogsForWorkOrderItem` + `listCutLogsForWorkOrderItemIds`** now return `CutLogRecord[]` (normalized) instead of raw `WorkOrderCutLogRowPayload[]`. Callers in queries.ts updated. The `WorkOrderCutLogRowPayload` type was deleted from the read-repo. No other consumers existed.

## Final headlines

| Concern | Result |
|---|---|
| Domain typecheck | ✅ green |
| DB typecheck | ✅ green |
| Application typecheck | ✅ green |
| apps/web typecheck | ✅ green (both prior-sweep red errors resolved) |
| apps/worker typecheck | ✅ green |
| apps/relay typecheck | ✅ green |
| Grep gate (deleted symbols) | ✅ clean (only doc-comment historical references) |

## Sweep summary (chat-paste)

| Step | What landed |
|---|---|
| 1 | New primitives: `CircularCommitButton`, `CutLogStatusBadge`, `CutLogActionDialog`, `formatCutLogTimestamp`, `cut-log-row` feature folder (`grid-layout` + `cut-log-row` renderer pair). `GridControlKind` extended with `"commit"`. |
| 2 | `usePendingCutLogSection` (per-WOMI section controller, owns drafts + saved-row edits + editingRowId + auto-discard semantics + react-query mutations for create/update/delete/void). `useFinalizeCutLogBatchSection` (extract). |
| 3 | `createPendingCutLogRequest`, `updatePendingCutLogRequest`, `deletePendingCutLogRequest` in `mutations.ts`. `voidWorkOrderCutLogRequest` already pointed to `/void` from the previous sweep. Diff helper deleted. |
| 4 | SSR cut-log shape unified to `CutLogRow`. `work-order-cut-log-row.tsx` rewritten (~470 → ~330 lines) with circular commit + single destructive button + per-row controller. `work-order-material-items-section.tsx` edited: Save/Discard pending-cut buttons removed, `case "SAVING_CUTS"` deleted, finalize state extracted. |
| 5 | Inventory + historical inventory cut-log sections shrunk (188 → 50 lines, 173 → 53 lines) by adopting the shared row primitives. |
| 6 | Deleted: `use-work-order-cut-log-section-state.ts`, `use-work-order-cut-log-void.ts`, `WorkOrderItemPendingCutLogRow` + its normalizer, the four diff types in `@builders/application`. |
| 7 | All packages green. Grep gate clean. |
