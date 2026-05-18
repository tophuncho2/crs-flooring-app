import type { CutLogRow } from "@builders/domain"
import type { CutLogEditForm, CutLogPanelLocal } from "./types"

export const EMPTY_FORM: CutLogEditForm = {
  inventoryId: "",
  cut: "",
  isWaste: false,
  notes: "",
}

export const EMPTY_LOCAL: CutLogPanelLocal = {
  locationFilter: "",
  pickedInventoryLabel: "",
  pickedInventoryStockUnitAbbrev: "",
}

export function buildEditForm(cutLog: CutLogRow): CutLogEditForm {
  return {
    inventoryId: cutLog.inventoryId,
    cut: cutLog.cut,
    isWaste: cutLog.isWaste,
    notes: cutLog.notes,
  }
}

export function formIsDirty(current: CutLogEditForm, baseline: CutLogEditForm): boolean {
  return (
    current.inventoryId !== baseline.inventoryId ||
    current.cut !== baseline.cut ||
    current.isWaste !== baseline.isWaste ||
    current.notes !== baseline.notes
  )
}

export function isCreateValid(form: CutLogEditForm): boolean {
  return form.inventoryId !== "" && form.cut.trim() !== ""
}

export function isEditValid(form: CutLogEditForm): boolean {
  return form.cut.trim() !== ""
}
