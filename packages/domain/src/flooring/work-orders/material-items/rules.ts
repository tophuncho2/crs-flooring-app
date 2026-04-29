import type { WorkOrderMaterialItemForm } from "./types.js"

export function validateWorkOrderMaterialItemForm(input: WorkOrderMaterialItemForm) {
  if (!input.productId) return "Product is required"
  const quantity = Number(input.quantity)
  if (!input.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
