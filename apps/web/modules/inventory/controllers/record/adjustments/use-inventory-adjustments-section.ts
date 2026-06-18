"use client"

import { useCallback } from "react"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import { EDIT_PICKER_CONFIG } from "./form"
import { useAdjustmentEditController } from "./use-adjustment-edit-controller"

/**
 * Adjustments section of the inventory record view. Owns the shared, scope-aware
 * adjustment state machine (`useAdjustmentEditController`) pointed at this
 * inventory, plus the open-spec builder the drilldown detail face needs:
 *
 *   - `openEdit(row)` → edit an existing adjustment (`EDIT_PICKER_CONFIG`).
 *
 * Create is no longer an embedded face — it's the `InventoryAdjustmentCreateModal`
 * (its own controller via `useAdjustmentCreateForm`); this section drives **edit**
 * only. `onMutated` fires after every panel mutation so the host can refresh the
 * paginated adjustments list and the inventory balances.
 */
export function useInventoryAdjustmentsSection({
  inventory,
  onMutated,
}: {
  inventory: InventoryDetail
  onMutated: () => void
}) {
  const panel = useAdjustmentEditController({
    scope: { kind: "inventory", inventoryId: inventory.id },
    // Edit-only — create is the modal. A create open-spec on this panel no-ops.
    canCreate: false,
    publish: onMutated,
  })

  const openEdit = useCallback(
    (row: EnrichedInventoryAdjustmentRow) => {
      panel.openPanel({
        mode: "edit",
        pickerConfig: EDIT_PICKER_CONFIG,
        adjustment: row,
      })
    },
    [panel],
  )

  return { panel, openEdit }
}
