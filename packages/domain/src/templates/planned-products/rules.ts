import type { TemplatePlannedProductForm } from "./types.js"

// Product is required. Quantity is optional — a blank value means "unset"
// (persisted as NULL); when a value IS provided it must be a finite number greater
// than zero. (Bid cost is a live product-cost read-join, not a validated form
// field — the planned product stores no money columns of its own.)
export function validateTemplatePlannedProductForm(input: TemplatePlannedProductForm) {
  if (!input.productId) return "Product is required"
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
