import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import type { AdjustmentPanelRow } from "@/modules/adjustments"

/**
 * Normalize an inventory-side adjustment row (or anything structurally
 * close to a `AdjustmentPanelRow`) into the exact `AdjustmentPanelRow` shape the
 * embedded adjustment panel expects. The shared adjustment panel treats the
 * three optional snapshot labels (`workOrderNumber`,
 * `workOrderItemProductLabel`, `warehouseName`) as `string | null` —
 * inventory-side reads can hand back `undefined`, so this collapses both
 * to `null` to keep the panel's read-only summary stable.
 *
 * Used by both `openForAdjustmentEdit` (external opener) and
 * `enterAdjustmentEditFromContext` (internal transition) so adding a new
 * optional-to-null field touches one place.
 */
export function toAdjustmentPanelRow(
  row: AdjustmentPanelRow | EnrichedInventoryAdjustmentRow,
): AdjustmentPanelRow {
  return {
    ...row,
    workOrderNumber: row.workOrderNumber ?? null,
    workOrderItemProductLabel: row.workOrderItemProductLabel ?? null,
    warehouseName: row.warehouseName ?? null,
  }
}
