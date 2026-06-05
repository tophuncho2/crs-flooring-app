"use client"

import { useCallback } from "react"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import {
  EDIT_PICKER_CONFIG,
  HUB_CREATE_PICKER_CONFIG,
  useAdjustmentEditPanel,
} from "@/modules/adjustments"
import type { InventoryRecordWoSeed } from "@/modules/inventory/controllers/record/use-inventory-record-selection"

/**
 * Adjustments section of the inventory record view. Owns the shared, scope-aware
 * adjustment state machine (`useAdjustmentEditPanel`) pointed at this inventory,
 * plus the two open-spec builders the drilldown detail face needs:
 *
 *   - `openCreate()` → a manual INCREASE/DEDUCTION on this inventory. Warehouse
 *     / inventory / location are locked pickers seeded from the snapshot
 *     (`HUB_CREATE_PICKER_CONFIG`); the work-order link stays editable. When the
 *     record view was opened from a work order (`woSeed`), the WO link is
 *     pre-filled (still editable) so the operator doesn't re-pick it.
 *   - `openEdit(row)` → edit an existing adjustment (`EDIT_PICKER_CONFIG`).
 *
 * `onMutated` fires after every panel mutation so the host can refresh the
 * paginated adjustments list and the inventory balances.
 */
export function useInventoryAdjustmentsSection({
  inventory,
  onMutated,
  woSeed,
}: {
  inventory: InventoryDetail
  onMutated: () => void
  woSeed?: InventoryRecordWoSeed | null
}) {
  const panel = useAdjustmentEditPanel({
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
        productId: inventory.productId,
        stockUnitAbbrev: inventory.stockUnitAbbrev,
        // Pre-link the originating work order (editable) when opened from a WO.
        ...(woSeed
          ? {
              workOrderId: woSeed.workOrderId,
              workOrderItemId: woSeed.workOrderItemId,
              workOrderLabel: woSeed.workOrderLabel ?? undefined,
              materialItemLabel: woSeed.materialItemLabel ?? undefined,
              materialItemNotes: woSeed.materialItemNotes ?? undefined,
            }
          : {}),
      },
    })
  }, [panel, inventory, woSeed])

  const openEdit = useCallback(
    (row: EnrichedInventoryAdjustmentRow) => {
      panel.openPanel({
        mode: "edit",
        pickerConfig: EDIT_PICKER_CONFIG,
        workOrderItemId: row.workOrderItemId,
        adjustment: row,
      })
    },
    [panel],
  )

  return { panel, openCreate, openEdit }
}
