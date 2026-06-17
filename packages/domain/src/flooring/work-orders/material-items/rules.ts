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

// A product may be linked at most once per work order (enforced canonically
// by the DB unique constraint). Surfaced when a save would create or leave a
// second row for the same product.
export function buildWorkOrderMaterialItemDuplicateProductMessage(): string {
  return `This product is already on the work order. Each product can only be added once.`
}
