import type { InventoryAdjustmentRow } from "@builders/domain"
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
  workOrderId: null,
  workOrderItemId: null,
}

export const EMPTY_LOCAL: AdjustmentEditLocal = {
  locationFilter: "",
  pickedWarehouseLabel: "",
  pickedInventoryItem: "",
  pickedInventoryNumber: "",
  pickedInventoryRollNumber: "",
  pickedInventoryDyeLot: "",
  pickedInventoryNote: "",
  pickedInventoryStockUnitAbbrev: "",
  pickedWorkOrderLabel: "",
  pickedWorkOrderItemLabel: "",
  pickedWorkOrderItemNotes: "",
}

export function buildEditForm(adjustment: InventoryAdjustmentRow): AdjustmentEditForm {
  return {
    inventoryId: adjustment.inventoryId,
    warehouseId: adjustment.warehouseId,
    adjustmentType: adjustment.adjustmentType,
    quantity: adjustment.quantity,
    isWaste: adjustment.isWaste,
    notes: adjustment.notes,
    workOrderId: adjustment.workOrderId,
    workOrderItemId: adjustment.workOrderItemId,
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
    pickedInventoryItem: adjustment.inventoryItem ?? "",
    pickedInventoryNumber: adjustment.inventoryNumber ?? "",
    pickedInventoryRollNumber: adjustment.rollNumber ?? "",
    pickedInventoryDyeLot: adjustment.dyeLot ?? "",
    pickedInventoryNote: adjustment.inventoryNote ?? "",
    pickedInventoryStockUnitAbbrev: adjustment.stockUnitAbbrev ?? "",
    pickedWorkOrderLabel: adjustment.workOrderNumber ? `#${adjustment.workOrderNumber}` : "",
    pickedWorkOrderItemLabel:
      adjustment.workOrderItemProductLabel ?? adjustment.productName ?? "",
    pickedWorkOrderItemNotes: adjustment.workOrderItemNotes ?? "",
  }
}

export function buildCreateForm(seed: AdjustmentCreateSeed): AdjustmentEditForm {
  return {
    ...EMPTY_FORM,
    inventoryId: seed.inventoryId ?? "",
    warehouseId: seed.warehouseId ?? null,
    workOrderId: seed.workOrderId ?? null,
    workOrderItemId: seed.workOrderItemId ?? null,
  }
}

export function buildCreateLocal(seed: AdjustmentCreateSeed): AdjustmentEditLocal {
  return {
    locationFilter: seed.locationLabel ?? "",
    pickedWarehouseLabel: seed.warehouseLabel ?? "",
    pickedInventoryItem: seed.inventoryItem ?? "",
    pickedInventoryNumber: seed.inventoryNumber ?? "",
    pickedInventoryRollNumber: seed.inventoryRollNumber ?? "",
    pickedInventoryDyeLot: seed.inventoryDyeLot ?? "",
    pickedInventoryNote: seed.inventoryNote ?? "",
    pickedInventoryStockUnitAbbrev: seed.stockUnitAbbrev ?? "",
    pickedWorkOrderLabel: seed.workOrderLabel ?? "",
    pickedWorkOrderItemLabel: seed.materialItemLabel ?? "",
    pickedWorkOrderItemNotes: seed.materialItemNotes ?? "",
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
    current.workOrderId !== baseline.workOrderId ||
    current.workOrderItemId !== baseline.workOrderItemId
  )
}

export function isCreateValid(form: AdjustmentEditForm): boolean {
  return form.inventoryId !== "" && form.quantity.trim() !== ""
}

export function isEditValid(form: AdjustmentEditForm): boolean {
  // Link symmetry mirrors the backend `assertAdjustmentLinkageSymmetry`: a WO and
  // its material item are set together or not at all. Blocks saving the
  // transient WO-set / WOMI-unresolved state during an auto-link.
  const linkSymmetric = Boolean(form.workOrderId) === Boolean(form.workOrderItemId)
  return form.quantity.trim() !== "" && linkSymmetric
}
