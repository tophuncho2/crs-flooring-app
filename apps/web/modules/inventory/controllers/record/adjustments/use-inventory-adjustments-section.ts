"use client"

import { useCallback } from "react"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import { EDIT_PICKER_CONFIG, HUB_CREATE_PICKER_CONFIG } from "./form"
import { useAdjustmentEditController } from "./use-adjustment-edit-controller"
import type { InventoryRecordWoSeed } from "@/modules/inventory/controllers/record/use-inventory-record-selection"

/**
 * Adjustments section of the inventory record view. Owns the shared, scope-aware
 * adjustment state machine (`useAdjustmentEditController`) pointed at this inventory,
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
        // Pre-link the originating work order (editable) when opened from a WO.
        // Adjustments link to any work order regardless of product, so no
        // product-match gate is needed.
        ...(woSeed
          ? {
              workOrderId: woSeed.workOrderId,
              workOrderLabel: woSeed.workOrderLabel ?? undefined,
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
        adjustment: row,
      })
    },
    [panel],
  )

  return { panel, openCreate, openEdit }
}
