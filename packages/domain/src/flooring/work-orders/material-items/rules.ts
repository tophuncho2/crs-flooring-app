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
  return validateQuantity(input.quantity)
}

/**
 * Product is immutable post-create — full stop. The WOMI carries
 * product-derived snapshots (`productName`, `sendUnitName`,
 * `sendUnitAbbrev`) AND linked cut logs scope their inventory search by
 * `workOrderItem.productId` (see `listEligibleInventoryForWorkOrderItem`
 * in the data layer). Letting product change post-create would drift
 * the snapshots and silently sever every cut-log linkage to inventory.
 *
 * Returns true when the caller is attempting to change the product,
 * false otherwise. Both ids are compared trimmed so whitespace noise
 * doesn't trigger a false positive.
 *
 * Defense in depth: `WorkOrderMaterialItemUpdateForm` omits `productId`
 * and the API PATCH validator rejects the field on the wire. This
 * predicate exists for tests + out-of-band callers (admin scripts) that
 * bypass the type system.
 */
export function isWorkOrderMaterialItemProductChangeBlocked(
  currentProductId: string,
  nextProductId: string,
): boolean {
  return currentProductId.trim() !== nextProductId.trim()
}

export function buildWorkOrderMaterialItemProductLockedMessage(): string {
  return `Product cannot change after a material item is created.`
}

// A product may be linked at most once per work order (enforced canonically
// by the DB unique constraint). Surfaced when a save would create or leave a
// second row for the same product.
export function buildWorkOrderMaterialItemDuplicateProductMessage(): string {
  return `This product is already on the work order. Each product can only be added once.`
}
