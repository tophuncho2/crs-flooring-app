"use client"

import { useCallback } from "react"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import { EDIT_PICKER_CONFIG, HUB_CREATE_PICKER_CONFIG } from "./form"
import { useAdjustmentEditController } from "./use-adjustment-edit-controller"

/**
 * Adjustments section of the inventory record view. Owns the shared, scope-aware
 * adjustment state machine (`useAdjustmentEditController`) pointed at this inventory,
 * plus the two open-spec builders the drilldown detail face needs:
 *
 *   - `openCreate()` → a manual INCREASE/DEDUCTION on this inventory. Warehouse
 *     / inventory / location are locked pickers seeded from the snapshot
 *     (`HUB_CREATE_PICKER_CONFIG`); the work-order link stays editable (any
 *     product — adjustments link to any WO).
 *   - `openEdit(row)` → edit an existing adjustment (`EDIT_PICKER_CONFIG`).
 *
 * `onMutated` fires after every panel mutation so the host can refresh the
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
    canCreate: true,
    publish: onMutated,
  })

  const openCreate = useCallback(() => {
    panel.openPanel({
      mode: "create",
      pickerConfig: HUB_CREATE_PICKER_CONFIG,
      seed: {
        inventoryId: inventory.id,
        warehouseId: inventory.warehouseId,
        warehouseLabel: inventory.warehouseName,
        inventoryItem: inventory.inventoryItem,
        inventoryNumber: inventory.inventoryNumber,
        inventoryRollNumber: inventory.rollNumber,
        inventoryDyeLot: inventory.dyeLot,
        inventoryNote: inventory.note,
        locationLabel: inventory.location,
        stockUnitAbbrev: inventory.stockUnitAbbrev,
      },
    })
  }, [panel, inventory])

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

  return { panel, openCreate, openEdit }
}
