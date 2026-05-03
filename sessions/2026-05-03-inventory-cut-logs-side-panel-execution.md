# Inventory Cut-Logs — Side-Panel Pattern · Execution Summary

Plan: `~/.claude/plans/analyze-the-modules-work-orders-director-abstract-treasure.md`
Branch: `staging`
Status: **executed** · awaiting browser smoke test · not committed

## What changed

Brought the inventory record view's cut-log surface in line with the work-orders cut-log pattern:

- Two grids ("Cut Logs" + "Final & Voided Cut Logs") merged into **one** grid.
- Rows ordered: PENDING first (insertion-order = SSR createdAt-asc), then FINAL/VOID interleaved by `finalCutSequence` ascending.
- Status pill moved from trailing-control to **first data column** (matches `WO_CUT_LOG_LAYOUT`).
- Dropped from row grid (panel-only): `workOrder`, `workOrderItem`, `createdAt`, `updatedAt`.
- Row click opens a right-anchored **view-only side panel** showing every field including the panel-only ones.
- No "+ Add Cut Log" button (cut-log mutations stay in work-orders per sweep 4a/4b).

## Files

| Action | Path |
|---|---|
| Modify | `apps/web/components/features/cut-log-row/grid-layout.ts` |
| Modify | `apps/web/components/features/cut-log-row/cut-log-row.tsx` |
| Modify | `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` |
| Modify | `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` |
| Create | `apps/web/modules/inventory/controllers/use-inventory-cut-log-view-panel.ts` |
| Create | `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-log-view-panel.tsx` |
| Delete | `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` |

## Per-file change notes

### `components/features/cut-log-row/grid-layout.ts`
- Added `status` entry (first) to `CUT_LOG_COLUMN_DEFINITIONS`.
- Rewrote `INVENTORY_CUT_LOG_LAYOUT` to: `status · cutLogNumber · cut · coverageCut · isWaste · before · after · finalSeq · notes`. Dropped `trailingControls`.
- Removed the `INVENTORY_HISTORICAL_CUT_LOG_LAYOUT` export (no remaining consumers).
- Updated the file's leading docstring; trailing-control language removed.

### `components/features/cut-log-row/cut-log-row.tsx`
- Added `case "status": return <CutLogStatusBadge status={row.status as FlooringCutLogStatus} />` to `renderCutLogReadOnlyCell`. Any consumer with `status` in `dataColumns` now renders without local wrapping. Work-orders' local wrapper at `work-order-cut-log-row.tsx:82` still runs first and is unaffected.

### `modules/inventory/components/record/inventory-record-panel.tsx`
- Replaced `pendingCutLogs` / `historicalCutLogs` split with a single `sortedCutLogs` memo (pending → sequenced FINAL/VOID by `finalCutSequence` asc).
- Collapsed two sections to one (`key: "cut-logs"`, `order: 10`); dropped `historical-cut-logs` section + import.
- Added `useInventoryCutLogViewPanel` hook + `<InventoryCutLogViewPanel … />` rendered as a sibling of `<RecordMultiSectionPanel>`.
- Passes `cutLogViewPanel.openPanel` into the section as `onRowClick`.

### `modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx`
- Now consumes a single sorted `rows: CutLogRow[]` provided by the parent.
- Drops `renderControl` (status is a data column now).
- Wires `onRowClick` + `getRowAriaLabel` on `<Grid>`.
- Summary: `"N logs · X cut total · P pending · F final · V voided"` (zero buckets suppressed).
- Empty-state copy: `"No cut logs on this inventory."`

### `modules/inventory/controllers/use-inventory-cut-log-view-panel.ts` (new)
- Tiny hook: `{ open, openPanel(cutLog), close }`. No form state, no mutations, no dirty tracking. Stripped-down sibling of `useCutLogEditPanel`.

### `modules/inventory/components/record/cut-logs/inventory-cut-log-view-panel.tsx` (new)
- `<SidePanel side="right" widthClassName="w-[28rem]" title={cutLog.cutLogNumber} />`.
- Body uses `<FieldSection>` + `<CellAt>` + `<FormField>` (8-col invisible grid, project canon).
- All cells `editable={false}`. Layout (top→bottom):
  - Row 1: Status (1-2) · Cut # (3-5) · Final seq (6-8)
  - Row 2: Cut (1-4) · Coverage (5-8)
  - Row 3: Before (1-3) · After (4-6) · Waste (7-8)
  - Row 4: Notes (1-8)
  - Row 5: Work order (1-4) · Material item (5-8) — raw UUIDs (open-question #2 deferred)
  - Row 6: Created (1-4) · Updated (5-8)
- No action footer. Close via `SidePanel`'s built-in X button, backdrop, or Esc (open-question #3 resolved by built-in close affordance).

## Verification

| Check | Result |
|---|---|
| `tsc -p apps/web/tsconfig.json --noEmit` | **clean** (no output) |
| `eslint` on six touched files | **clean** (1 pre-existing `react/display-name` warning on `cut-log-row.tsx` — present before this change, unaffected by edits) |
| Browser smoke (Chrome MCP) | **not run** — manual check pending |

### Manual smoke checklist (paste into a follow-up if anything fails)

1. Open inventory record with cut logs (e.g. `INV-00018`).
2. One "Cut Logs" section, no "Final & Voided" section.
3. Columns: **Status · Cut # · Cut · Coverage · Waste · Before · After · Seq · Notes**.
4. Row order: PENDING first, then FINAL/VOID by `finalCutSequence` asc.
5. Click a row → right-anchored panel opens, title = cut-log number, all fields visible incl. work order id, material item id, created, updated.
6. Backdrop / Esc / X dismisses the panel.
7. No "+ Add Cut Log" button.
8. Work-orders record view cut-log surface unchanged (regression check on the shared `renderCutLogReadOnlyCell` `status` case).

## Open questions still standing

| # | Question | Resolution |
|---|---|---|
| 1 | Section summary text | **Resolved** — kept "N logs · X cut total" and appended pending/final/voided breakdown (zero buckets suppressed). |
| 2 | WO / Material Item display | **Deferred** — shipped raw UUIDs. Follow-up: resolve to `WO-####` / `MI-####` via lookup endpoint. |
| 3 | Explicit Close button | **Resolved** — relying on `SidePanel`'s built-in X + backdrop + Esc (matches WO panel). |

## Suggested commit message

```
ui(inventory): merge cut-log grids and add view-only row-click side panel

- Merge "Cut Logs" + "Final & Voided" into one grid; pending first, then
  final/void by finalCutSequence asc.
- Drop work-order/material-item/created/updated from row; show in panel.
- Move status pill to first data column; drop trailing-control.
- Add view-only InventoryCutLogViewPanel built on shared SidePanel +
  FieldSection primitives.
```

## Cleanup follow-ups (future passes)

- Pre-existing `react/display-name` warning on `renderCutLogReadOnlyCell` (the inner returned arrow). Not introduced here; leave for a dedicated lint sweep.

---

## Second pass — resolve WO# + product label, slim panel to identity context

Open question #2 ("WO/MI display") promoted to a real change after user feedback that UUIDs were unhelpful. Panel scope tightened: only **Status · Cut # · Work order · Material item · Created · Updated**. All quantity/notes fields dropped — the row grid already shows them, the panel is now identity context only.

### Layered changes

| Layer | File | Change |
|---|---|---|
| Domain | `packages/domain/src/flooring/inventory/cut-logs/types.ts` | New sibling type `InventoryCutLogRow = CutLogRow & { workOrderNumber: string \| null; workOrderItemProductLabel: string \| null }`. WO side keeps using plain `CutLogRow`. |
| Domain | `packages/domain/src/flooring/inventory/types.ts` | Re-export `InventoryCutLogRow`; `InventoryDetail.cutLogs` widened to `InventoryCutLogRow[]`. |
| Data | `packages/db/src/flooring/inventory/cut-logs/shared.ts` | New `inventoryCutLogRowSelect` (extends `cutLogRowSelect` with `workOrder.workOrderNumber` + `workOrderItem.product.{name,style,color}` joins) + `InventoryCutLogRowPayload` type. |
| Data | `packages/db/src/flooring/inventory/cut-logs/read-repository.ts` | New `normalizeInventoryCutLogRow` — calls `normalizeCutLogRow` then stamps the two labels via `buildFlooringProductDisplayName` (per `packages/db/CLAUDE.md` carve-out). |
| Data | `packages/db/src/flooring/inventory/shared.ts` | `inventoryDetailSelect.cutLogs.select` switched to `inventoryCutLogRowSelect`. |
| Data | `packages/db/src/flooring/inventory/read-repository.ts` | `normalizeInventoryDetail` switched to `normalizeInventoryCutLogRow`. |
| UI | `apps/web/modules/inventory/controllers/use-inventory-cut-log-view-panel.ts` | Hook typed at `InventoryCutLogRow`. |
| UI | `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-log-view-panel.tsx` | Stripped to 6 fields (Status, Cut #, Work order, Material item, Created, Updated). Drops unit-fallback props (no quantity cells). |
| UI | `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` | Row type tightened to `InventoryCutLogRow`. |
| UI | `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` | Drops unit-fallback props passed to view panel. |

### Verification

| Check | Result |
|---|---|
| `tsc` build of `@builders/domain` | clean |
| `tsc` build of `@builders/db` | clean |
| `tsc -p apps/web/tsconfig.json --noEmit` | clean |
| `eslint` on the four touched apps/web files | clean |
| Browser smoke | pending |

### Scope decisions

- **Sibling type, not extend `CutLogRow`.** Keeps WO-side surface area unchanged; extra fields are explicit on the inventory wire shape only.
- **Server-side resolve, not lazy fetch.** Inventory's record-detail SSR payload now joins WO + product per cut log. Two extra joins per row at read time — fine for typical record sizes (<50 cut logs).
- **WO panel untouched** per user direction.

### Suggested commit message

```
data+ui(inventory): resolve cut-log WO# and material item product server-side

- Domain: add InventoryCutLogRow sibling type carrying server-resolved
  workOrderNumber + workOrderItemProductLabel; widen InventoryDetail.cutLogs.
- Data: inventoryCutLogRowSelect joins workOrder.workOrderNumber and
  workOrderItem.product.{name,style,color}; normalizeInventoryCutLogRow
  uses buildFlooringProductDisplayName per the data-layer carve-out.
- UI: strip the inventory cut-log view panel to identity context only —
  Status, Cut #, Work order, Material item, Created, Updated. WO panel
  unchanged.
```
