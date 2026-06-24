import { DEFAULT_PALETTE_COLOR, type InventoryAdjustmentRow } from "@builders/domain"
import type {
  AdjustmentCreateSeed,
  AdjustmentEditForm,
  AdjustmentEditLocal,
  AdjustmentEditRow,
  AdjustmentPickerConfig,
} from "./types"

/**
 * Canonical per-context picker configs. WO-create lets the operator choose
 * warehouse → inventory → location (cross-warehouse sourcing) and relink the
 * WO. Hub-create locks warehouse/inventory/location to the parent inventory but
 * keeps the WO relinkable. Edit hides the location filter entirely — it's a
 * search-narrowing aid only meaningful while picking, not on a saved row.
 */
export const WO_CREATE_PICKER_CONFIG: AdjustmentPickerConfig = {
  workOrder: "editable",
  warehouse: "editable",
  inventory: "editable",
  location: "editable",
}
export const HUB_CREATE_PICKER_CONFIG: AdjustmentPickerConfig = {
  workOrder: "editable",
  warehouse: "locked",
  inventory: "locked",
  location: "locked",
}
export const EDIT_PICKER_CONFIG: AdjustmentPickerConfig = {
  workOrder: "editable",
  warehouse: "locked",
  inventory: "locked",
  location: "hidden",
}

export const EMPTY_FORM: AdjustmentEditForm = {
  inventoryId: "",
  warehouseId: null,
  adjustmentType: "DEDUCTION",
  quantity: "",
  isWaste: false,
  notes: "",
  color: DEFAULT_PALETTE_COLOR,
  location: "",
  workOrderId: null,
}

export const EMPTY_LOCAL: AdjustmentEditLocal = {
  locationFilter: "",
  pickedWarehouseLabel: "",
  pickedInventoryNumber: "",
  pickedInventoryRollNumber: "",
  pickedInventoryDyeLot: "",
  pickedInventoryNote: "",
  pickedInventoryStockUnitAbbrev: "",
  pickedWorkOrderLabel: "",
}

export function buildEditForm(adjustment: InventoryAdjustmentRow): AdjustmentEditForm {
  return {
    inventoryId: adjustment.inventoryId,
    warehouseId: adjustment.warehouseId,
    adjustmentType: adjustment.adjustmentType,
    quantity: adjustment.quantity,
    isWaste: adjustment.isWaste,
    notes: adjustment.notes,
    color: adjustment.color,
    location: adjustment.location ?? "",
    workOrderId: adjustment.workOrderId,
  }
}

/**
 * Local picker-trigger labels for edit mode. Warehouse / inventory / location
 * are locked, so their labels come straight off the row's frozen snapshot.
 */
export function buildEditLocal(adjustment: AdjustmentEditRow): AdjustmentEditLocal {
  return {
    locationFilter: adjustment.location ?? "",
    pickedWarehouseLabel: adjustment.warehouseName ?? "",
    pickedInventoryNumber: adjustment.inventoryNumber ?? "",
    pickedInventoryRollNumber: adjustment.rollNumber ?? "",
    pickedInventoryDyeLot: adjustment.dyeLot ?? "",
    pickedInventoryNote: adjustment.inventoryNote ?? "",
    pickedInventoryStockUnitAbbrev: adjustment.stockUnitAbbrev ?? "",
    pickedWorkOrderLabel: adjustment.workOrderNumber ? `#${adjustment.workOrderNumber}` : "",
  }
}

export function buildCreateForm(seed: AdjustmentCreateSeed): AdjustmentEditForm {
  return {
    ...EMPTY_FORM,
    inventoryId: seed.inventoryId ?? "",
    warehouseId: seed.warehouseId ?? null,
    // Seed from the parent inventory's location and lock the field during create
    // (the cell is read-only in create mode). It becomes user-owned/editable once
    // the row exists. In the only live create path the seed carries the locked
    // parent inventory's location as `locationLabel`.
    location: seed.locationLabel ?? "",
    workOrderId: seed.workOrderId ?? null,
    // Adjustment values — the duplicate flow carries these from the source row;
    // a blank create leaves them undefined → EMPTY_FORM defaults.
    quantity: seed.quantity ?? EMPTY_FORM.quantity,
    adjustmentType: seed.adjustmentType ?? EMPTY_FORM.adjustmentType,
    isWaste: seed.isWaste ?? EMPTY_FORM.isWaste,
    notes: seed.notes ?? EMPTY_FORM.notes,
    color: seed.color ?? EMPTY_FORM.color,
  }
}

export function buildCreateLocal(seed: AdjustmentCreateSeed): AdjustmentEditLocal {
  return {
    locationFilter: seed.locationLabel ?? "",
    pickedWarehouseLabel: seed.warehouseLabel ?? "",
    pickedInventoryNumber: seed.inventoryNumber ?? "",
    pickedInventoryRollNumber: seed.inventoryRollNumber ?? "",
    pickedInventoryDyeLot: seed.inventoryDyeLot ?? "",
    pickedInventoryNote: seed.inventoryNote ?? "",
    pickedInventoryStockUnitAbbrev: seed.stockUnitAbbrev ?? "",
    pickedWorkOrderLabel: seed.workOrderLabel ?? "",
  }
}

export function formIsDirty(current: AdjustmentEditForm, baseline: AdjustmentEditForm): boolean {
  return (
    current.inventoryId !== baseline.inventoryId ||
    current.warehouseId !== baseline.warehouseId ||
    current.adjustmentType !== baseline.adjustmentType ||
    current.quantity !== baseline.quantity ||
    current.isWaste !== baseline.isWaste ||
    current.notes !== baseline.notes ||
    current.color !== baseline.color ||
    current.location !== baseline.location ||
    current.workOrderId !== baseline.workOrderId
  )
}

export function isCreateValid(form: AdjustmentEditForm): boolean {
  return form.inventoryId !== "" && form.quantity.trim() !== ""
}

export function isEditValid(form: AdjustmentEditForm): boolean {
  // The WO link is a plain optional `workOrderId` (any product) — no symmetry
  // constraint, so a non-empty quantity is the only edit requirement.
  return form.quantity.trim() !== ""
}
