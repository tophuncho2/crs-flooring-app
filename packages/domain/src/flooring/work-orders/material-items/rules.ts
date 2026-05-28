import type {
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemUpdateForm,
} from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero;
// garbage and non-positive values are still rejected.
function validateQuantity(quantity: string): string {
  if (!quantity.trim()) return ""
  const parsed = Number(quantity)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}

export function validateWorkOrderMaterialItemCreateForm(
  input: WorkOrderMaterialItemCreateForm,
): string {
  if (!input.productId) return "Product is required"
  return validateQuantity(input.quantity)
}

export function validateWorkOrderMaterialItemUpdateForm(
  input: WorkOrderMaterialItemUpdateForm,
): string {
  if (!input.productId) return "Product is required"
  return validateQuantity(input.quantity)
}

/**
 * The product stays editable until the item has linked (non-void) cut logs.
 * Once a cut log exists, the product is locked — the WOMI carries
 * product-derived snapshots (`productName`, `sendUnitName`, `sendUnitAbbrev`)
 * and its cut logs scope their inventory search by `workOrderItem.productId`
 * (see `listEligibleInventoryForWorkOrderItem`). Changing the product then
 * would drift the snapshots and sever every cut-log → inventory linkage; the
 * row can only be deleted instead.
 *
 * Returns true when the caller is changing the product on an item that has
 * cut logs. Ids are compared trimmed so whitespace noise can't trigger a
 * false positive. The caller supplies `hasCutLogs` from a non-void cut-log
 * count (the application layer counts them before the write).
 */
export function isWorkOrderMaterialItemProductChangeBlocked(
  hasCutLogs: boolean,
  currentProductId: string,
  nextProductId: string,
): boolean {
  return hasCutLogs && currentProductId.trim() !== nextProductId.trim()
}

export function buildWorkOrderMaterialItemProductLockedMessage(): string {
  return `Product cannot change once the item has linked cut logs.`
}

// A product may be linked at most once per work order (enforced canonically
// by the DB unique constraint). Surfaced when a save would create or leave a
// second row for the same product.
export function buildWorkOrderMaterialItemDuplicateProductMessage(): string {
  return `This product is already on the work order. Each product can only be added once.`
}
