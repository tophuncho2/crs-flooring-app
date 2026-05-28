import type { InventoryAdjustmentRow } from "@builders/domain"
import type { CutLogEditForm, CutLogPanelLocal } from "./types"

export const EMPTY_FORM: CutLogEditForm = {
  inventoryId: "",
  quantity: "",
  isWaste: false,
  notes: "",
  workOrderId: null,
  workOrderItemId: null,
}

export const EMPTY_LOCAL: CutLogPanelLocal = {
  locationFilter: "",
  pickedInventoryLabel: "",
  pickedInventoryStockUnitAbbrev: "",
  pickedWorkOrderLabel: "",
  pickedWorkOrderItemLabel: "",
  pickedWorkOrderItemNotes: "",
}

export function buildEditForm(cutLog: InventoryAdjustmentRow): CutLogEditForm {
  return {
    inventoryId: cutLog.inventoryId,
    quantity: cutLog.quantity,
    isWaste: cutLog.isWaste,
    notes: cutLog.notes,
    workOrderId: cutLog.workOrderId,
    workOrderItemId: cutLog.workOrderItemId,
  }
}

export function formIsDirty(current: CutLogEditForm, baseline: CutLogEditForm): boolean {
  return (
    current.inventoryId !== baseline.inventoryId ||
    current.quantity !== baseline.quantity ||
    current.isWaste !== baseline.isWaste ||
    current.notes !== baseline.notes ||
    current.workOrderId !== baseline.workOrderId ||
    current.workOrderItemId !== baseline.workOrderItemId
  )
}

export function isCreateValid(form: CutLogEditForm): boolean {
  return form.inventoryId !== "" && form.quantity.trim() !== ""
}

export function isEditValid(form: CutLogEditForm): boolean {
  // Link symmetry mirrors the backend `assertCutLogLinkageSymmetry`: a WO and
  // its material item are set together or not at all. Blocks saving the
  // transient WO-set / WOMI-unresolved state during an auto-link.
  const linkSymmetric = Boolean(form.workOrderId) === Boolean(form.workOrderItemId)
  return form.quantity.trim() !== "" && linkSymmetric
}
