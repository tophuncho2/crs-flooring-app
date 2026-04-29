import type { TemplateMaterialItemForm } from "./types.js"

export function validateTemplateMaterialItemForm(input: TemplateMaterialItemForm) {
  if (!input.productId) return "Product is required"
  const quantity = Number(input.quantity)
  if (!input.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
