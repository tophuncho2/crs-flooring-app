import type { GridLayout } from "@/engines/record-view"
import { ADJUSTMENT_COLUMN_DEFINITIONS } from "@/modules/adjustments"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Work-orders-side adjustment row layout. Shows the SAME column set as the
 * standalone `/dashboard/adjustments` ledger (only the order may differ) so
 * an operator scanning a WO sees every field the ledger surfaces — including
 * `location`, the decomposed inventory identity, type, warehouse, and WO #.
 * Rows are enriched (own warehouse name + WO number per row), correct under
 * cross-warehouse sourcing. Each row carries a leading open (↗) gutter and a
 * trailing options (⋮) menu — mirroring the inventory record view's adjustments
 * drilldown; the row body itself is inert. The inventory record view keeps the
 * slimmer `INVENTORY_ADJUSTMENT_LAYOUT`.
 */
const C = ADJUSTMENT_COLUMN_DEFINITIONS
export const WORK_ORDER_ADJUSTMENT_LAYOUT: GridLayout<EnrichedInventoryAdjustmentRow> = {
  leadingControls: [{ key: "open", kind: "open", width: 56 }],
  dataColumns: [
    C.quantity,
    C.adjustment,
    C.productName,
    C.inventoryNumber,
    C.rollNumber,
    C.dyeLot,
    C.inventoryNote,
    C.location,
    C.isWaste,
    C.notes,
    C.adjustmentNumber,
    C.adjustmentType,
    C.warehouseName,
    C.workOrderNumber,
    C.createdAt,
    C.updatedAt,
  ],
  trailingControls: [{ key: "options", kind: "actions", width: 56 }],
}
