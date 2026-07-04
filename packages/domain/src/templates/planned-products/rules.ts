import type { TemplatePlannedProductForm } from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero.
export function validateTemplatePlannedProductForm(input: TemplatePlannedProductForm) {
  if (!input.productId) return "Product is required"
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
