import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import type { CutLogPanelRow } from "@/modules/cut-logs"

/**
 * Normalize an inventory-side cut-log row (or anything structurally
 * close to a `CutLogPanelRow`) into the exact `CutLogPanelRow` shape the
 * embedded cut-log panel expects. The shared cut-log panel treats the
 * three optional snapshot labels (`workOrderNumber`,
 * `workOrderItemProductLabel`, `warehouseName`) as `string | null` —
 * inventory-side reads can hand back `undefined`, so this collapses both
 * to `null` to keep the panel's read-only summary stable.
 *
 * Used by both `openForCutLogEdit` (external opener) and
 * `enterCutLogEditFromContext` (internal transition) so adding a new
 * optional-to-null field touches one place.
 */
export function toCutLogPanelRow(
  row: CutLogPanelRow | EnrichedInventoryAdjustmentRow,
): CutLogPanelRow {
  return {
    ...row,
    workOrderNumber: row.workOrderNumber ?? null,
    workOrderItemProductLabel: row.workOrderItemProductLabel ?? null,
    warehouseName: row.warehouseName ?? null,
  }
}
