import type { InventoryAdjustmentRow } from "@builders/domain"
import type { AdjustmentEditForm, AdjustmentPanelLocal } from "./types"

export const EMPTY_FORM: AdjustmentEditForm = {
  inventoryId: "",
  adjustmentType: "DEDUCTION",
  quantity: "",
  isWaste: false,
  notes: "",
  workOrderId: null,
  workOrderItemId: null,
}

export const EMPTY_LOCAL: AdjustmentPanelLocal = {
  locationFilter: "",
  pickedInventoryLabel: "",
  pickedInventoryStockUnitAbbrev: "",
  pickedWorkOrderLabel: "",
  pickedWorkOrderItemLabel: "",
  pickedWorkOrderItemNotes: "",
}

export function buildEditForm(adjustment: InventoryAdjustmentRow): AdjustmentEditForm {
  return {
    inventoryId: adjustment.inventoryId,
    adjustmentType: adjustment.adjustmentType,
    quantity: adjustment.quantity,
    isWaste: adjustment.isWaste,
    notes: adjustment.notes,
    workOrderId: adjustment.workOrderId,
    workOrderItemId: adjustment.workOrderItemId,
  }
}

export function formIsDirty(current: AdjustmentEditForm, baseline: AdjustmentEditForm): boolean {
  return (
    current.inventoryId !== baseline.inventoryId ||
    current.adjustmentType !== baseline.adjustmentType ||
    current.quantity !== baseline.quantity ||
    current.isWaste !== baseline.isWaste ||
    current.notes !== baseline.notes ||
    current.workOrderId !== baseline.workOrderId ||
    current.workOrderItemId !== baseline.workOrderItemId
  )
}

export function isCreateValid(form: AdjustmentEditForm): boolean {
  return form.inventoryId !== "" && form.quantity.trim() !== ""
}

/**
 * Manual create validity. The parent inventory rides on the open spec (not the
 * form), so validity is just a chosen direction + a non-empty quantity.
 * Direction always has a value (`EMPTY_FORM` defaults to INCREASE).
 */
export function isManualCreateValid(form: AdjustmentEditForm): boolean {
  return form.quantity.trim() !== ""
}

export function isEditValid(form: AdjustmentEditForm): boolean {
  // Link symmetry mirrors the backend `assertAdjustmentLinkageSymmetry`: a WO and
  // its material item are set together or not at all. Blocks saving the
  // transient WO-set / WOMI-unresolved state during an auto-link.
  const linkSymmetric = Boolean(form.workOrderId) === Boolean(form.workOrderItemId)
  return form.quantity.trim() !== "" && linkSymmetric
}
