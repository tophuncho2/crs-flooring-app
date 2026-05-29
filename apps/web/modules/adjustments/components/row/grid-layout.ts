// Canonical column definitions for adjustment grids. Single source of truth for
// the metadata used by the inventory adjustment section and (independently) the
// work-order adjustment section. Consumers pick the keys they need to build a
// `GridLayout`. Status is a regular data column on every layout; rows that
// flip PENDING → FINAL keep the same column count.

import type { GridColumn } from "@/components/grid/contracts/grid-column"
import type { GridLayout } from "@/components/grid/contracts/grid-layout"
import type { InventoryAdjustmentRow } from "@builders/domain"

/**
 * Column metadata, keyed by stable column id. Consumers project the keys
 * they need into a `GridLayout.dataColumns` array.
 */
export const ADJUSTMENT_COLUMN_DEFINITIONS = {
  status: { key: "status", label: "Status", minWidth: 140, grow: 0, align: "center" },
  inventoryItem: { key: "inventoryItem", label: "Inventory Item", minWidth: 220, grow: 1.2 },
  location: { key: "location", label: "Location", minWidth: 140, grow: 0.5 },
  before: { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
  quantity: { key: "quantity", label: "Cut", minWidth: 144, grow: 0, align: "center" },
  after: { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
  coverage: { key: "coverage", label: "Coverage Cut", minWidth: 144, grow: 0, align: "center" },
  isWaste: { key: "isWaste", label: "Waste", minWidth: 88, grow: 0, align: "center" },
  notes: { key: "notes", label: "Notes", minWidth: 200, grow: 1 },
  adjustmentNumber: { key: "adjustmentNumber", label: "Adjustment #", minWidth: 132, grow: 0 },
  warehouse: { key: "warehouse", label: "Warehouse", minWidth: 160, grow: 0 },
} as const satisfies Record<string, GridColumn<InventoryAdjustmentRow>>

/**
 * Canonical 11-column shape used by BOTH the inventory record view's adjustment
 * section AND the work-orders material items section's adjustment grid. Order:
 * status → inventoryItem → location → before → cut → after → coverageCut →
 * isWaste → notes → adjustmentNumber → warehouse.
 *
 * `inventoryItem` cell renders the adjustment's frozen-at-create snapshot of
 * the parent inventory's identity (inv# / roll# / dyeLot / note). `location`
 * is a denormalized mirror that re-snaps on create / update / finalize and
 * clears on void — surfaced as its own column so operators can scan where
 * the cut originated without opening the panel. `isWaste` and `notes` are
 * the operator-editable fields from the adjustment side panel, surfaced as
 * read-only columns here so operators can scan without opening the panel.
 * `warehouse` reads `warehouseName` straight off the row. On the inv side
 * it's the joined snapshot label on `EnrichedInventoryAdjustmentRow`. On the WO side
 * the row shape is plain `InventoryAdjustmentRow`, so the consuming section hydrates
 * each row with the WO's warehouse name before handing the array to the
 * grid (every adjustment on a WO shares the WO's warehouse by construction).
 */
export const INVENTORY_ADJUSTMENT_LAYOUT: GridLayout<InventoryAdjustmentRow> = {
  dataColumns: [
    ADJUSTMENT_COLUMN_DEFINITIONS.status,
    ADJUSTMENT_COLUMN_DEFINITIONS.inventoryItem,
    ADJUSTMENT_COLUMN_DEFINITIONS.location,
    ADJUSTMENT_COLUMN_DEFINITIONS.before,
    ADJUSTMENT_COLUMN_DEFINITIONS.quantity,
    ADJUSTMENT_COLUMN_DEFINITIONS.after,
    ADJUSTMENT_COLUMN_DEFINITIONS.coverage,
    ADJUSTMENT_COLUMN_DEFINITIONS.isWaste,
    ADJUSTMENT_COLUMN_DEFINITIONS.notes,
    ADJUSTMENT_COLUMN_DEFINITIONS.adjustmentNumber,
    ADJUSTMENT_COLUMN_DEFINITIONS.warehouse,
  ],
}
