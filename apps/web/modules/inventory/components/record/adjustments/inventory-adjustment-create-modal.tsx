"use client"

import { useMemo } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import { useAdjustmentCreateForm } from "../../../controllers/record/adjustments/use-adjustment-create-form"
import { HUB_CREATE_PICKER_CONFIG } from "../../../controllers/record/adjustments/form"
import type { AdjustmentCreateSeed } from "../../../controllers/record/adjustments/types"
import { AdjustmentInventoryIdentityRow } from "./adjustment-inventory-identity-row"
import { AdjustmentRecordFields } from "./adjustment-record-fields"

export type InventoryAdjustmentCreateModalProps = {
  /** The record you're on — the adjustment is always locked to this inventory. */
  inventory: InventoryDetail
  /**
   * The row being duplicated — seeds the work-order link; quantity stays blank.
   * Null for a blank create ("+ Adjustment" / the list deep-link).
   */
  source?: EnrichedInventoryAdjustmentRow | null
  /** Dismiss without creating (✕ / backdrop / Escape / Cancel). */
  onClose: () => void
  /** Fired after a successful create — the host closes the modal and reconciles. */
  onCreated: () => void
}

/**
 * The inventory record view's **shell** over the shared adjustment create core,
 * for both "+ Adjustment" (blank) and the row ⋮ "Duplicate adjustment" action.
 * The inventory item is always the record you're on, so this shell injects a
 * fixed seed (warehouse / inventory / location locked, same as the old embedded
 * create face) and renders a **read-only** identity row above the shared
 * {@link AdjustmentRecordFields} — no picker grid. A `source` (duplicate)
 * additionally seeds its work-order link; quantity always starts blank. The
 * work-order picker stays editable (adjustments link to any work order).
 *
 * Mount it conditionally (only while a request is active) so each open starts from
 * a clean controller.
 */
export function InventoryAdjustmentCreateModal({
  inventory,
  source = null,
  onClose,
  onCreated,
}: InventoryAdjustmentCreateModalProps) {
  // Fixed seed off the locked inventory (mirrors the embedded create face). For a
  // duplicate, layer in the source row's work-order link. Stable across renders so
  // the panel opens once.
  const seed = useMemo<AdjustmentCreateSeed>(
    () => ({
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
      workOrderId: source?.workOrderId ?? null,
      workOrderLabel: source?.workOrderNumber ? `#${source.workOrderNumber}` : undefined,
    }),
    [inventory, source],
  )

  const controller = useAdjustmentCreateForm({
    scope: { kind: "inventory", inventoryId: inventory.id },
    seed,
    pickerConfig: HUB_CREATE_PICKER_CONFIG,
    onCreated,
  })

  const { canSave, isSaving, error } = controller

  return (
    <QuickCreateModal
      open
      title={source ? "Duplicate adjustment" : "Add adjustment"}
      widthClassName="max-w-3xl"
      onClose={onClose}
      onCreate={() => controller.save()}
      canCreate={canSave}
      isSaving={isSaving}
      error={error?.message ?? null}
    >
      <div className="flex flex-col gap-4">
        {/* Locked: the inventory is always this record, so the identity row is
            read-only confirmation — no Change affordance. */}
        <AdjustmentInventoryIdentityRow row={inventory} />
        <AdjustmentRecordFields controller={controller} mode="create" adjustment={null} />
      </div>
    </QuickCreateModal>
  )
}
