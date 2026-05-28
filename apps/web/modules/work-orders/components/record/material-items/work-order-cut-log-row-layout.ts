import type { GridLayout } from "@/components/grid"
import { INVENTORY_CUT_LOG_LAYOUT } from "@/modules/cut-logs"
import type { InventoryAdjustmentRow } from "@builders/domain"

/**
 * Work-orders-side cut-log row layout. Extends the canonical shared layout
 * (`INVENTORY_CUT_LOG_LAYOUT`) with a leading actions control column for
 * the per-row duplicate button. The inventory record view keeps using the
 * shared layout unmodified — duplicate is a work-orders-only affordance
 * because cut logs are only created from the work-orders side.
 */
export const WORK_ORDER_CUT_LOG_LAYOUT: GridLayout<InventoryAdjustmentRow> = {
  ...INVENTORY_CUT_LOG_LAYOUT,
  leadingControls: [{ key: "duplicate", kind: "actions", width: 56 }],
}
