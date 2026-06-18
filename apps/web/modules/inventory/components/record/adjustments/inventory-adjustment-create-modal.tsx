"use client"

import { useMemo } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"
import { useAdjustmentCreateForm } from "../../../controllers/record/adjustments/use-adjustment-create-form"
import { HUB_CREATE_PICKER_CONFIG } from "../../../controllers/record/adjustments/form"
import type { AdjustmentCreateSeed } from "../../../controllers/record/adjustments/types"
import { AdjustmentRecordFields } from "./adjustment-record-fields"

/**
 * What opened the inventory-side create modal:
 *   - `create`    → "Create with matching product" (a fresh adjustment on this item).
 *   - `duplicate` → "Duplicate adjustment" (seed the source row's work-order link;
 *                   quantity stays blank, like the work-order modal's duplicate).
 * Both lock the inventory to the record you're on — there is no picker grid.
 */
export type InventoryAdjustmentCreateRequest =
  | { kind: "create" }
  | { kind: "duplicate"; source: EnrichedInventoryAdjustmentRow }

export type InventoryAdjustmentCreateModalProps = {
  /** The record you're on — the adjustment is always locked to this inventory. */
  inventory: InventoryDetail
  request: InventoryAdjustmentCreateRequest
  /** Dismiss without creating (✕ / backdrop / Escape / Cancel). */
  onClose: () => void
  /** Fired after a successful create — the host closes the modal and reconciles. */
  onCreated: () => void
}

/**
 * The inventory record view's **shell** over the shared adjustment create core.
 * The inventory item is always the record you're on, so this shell injects a
 * fixed seed (warehouse / inventory / location locked, same as the embedded "+
 * Adjustment" face) and renders only the shared {@link AdjustmentRecordFields} —
 * no picker grid. Duplicate additionally carries the source row's work-order
 * link. The work-order picker stays editable (adjustments link to any work order).
 *
 * Mount it conditionally (only while a request is active) so each open starts from
 * a clean controller.
 */
export function InventoryAdjustmentCreateModal({
  inventory,
  request,
  onClose,
  onCreated,
}: InventoryAdjustmentCreateModalProps) {
  // Fixed seed off the locked inventory (mirrors the embedded create face). For a
  // duplicate, layer in the source row's work-order link. Stable across renders so
  // the panel opens once.
  const seed = useMemo<AdjustmentCreateSeed>(() => {
    const source = request.kind === "duplicate" ? request.source : null
    return {
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
    }
  }, [inventory, request])

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
      title="Add adjustment"
      widthClassName="max-w-3xl"
      onClose={onClose}
      onCreate={() => controller.save()}
      canCreate={canSave}
      isSaving={isSaving}
      error={error?.message ?? null}
    >
      <AdjustmentRecordFields controller={controller} mode="create" adjustment={null} />
    </QuickCreateModal>
  )
}
