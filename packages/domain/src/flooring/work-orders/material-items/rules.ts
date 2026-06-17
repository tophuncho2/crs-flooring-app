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
