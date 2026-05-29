import type { GridLayout } from "@/components/grid"
import { INVENTORY_ADJUSTMENT_LAYOUT } from "@/modules/adjustments"
import type { InventoryAdjustmentRow } from "@builders/domain"

/**
 * Work-orders-side adjustment row layout. Extends the canonical shared layout
 * (`INVENTORY_ADJUSTMENT_LAYOUT`) with a leading actions control column for
 * the per-row duplicate button. The inventory record view keeps using the
 * shared layout unmodified — duplicate is a work-orders-only affordance
 * because adjustments are only created from the work-orders side.
 */
export const WORK_ORDER_ADJUSTMENT_LAYOUT: GridLayout<InventoryAdjustmentRow> = {
  ...INVENTORY_ADJUSTMENT_LAYOUT,
  leadingControls: [{ key: "duplicate", kind: "actions", width: 56 }],
}
