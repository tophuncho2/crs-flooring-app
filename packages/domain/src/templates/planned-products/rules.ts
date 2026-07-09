import { isValidMarginPercent } from "./math.js"
import type { TemplatePlannedProductForm } from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero.
// Margin is optional too — blank = unset; when present it must be a valid
// gross-profit-margin percent (finite, < 100; negatives allowed = loss).
export function validateTemplatePlannedProductForm(input: TemplatePlannedProductForm) {
  if (!input.productId) return "Product is required"
  if (input.estimatedGrossProfitMargin.trim() && !isValidMarginPercent(input.estimatedGrossProfitMargin)) {
    return "Margin must be a percent below 100"
  }
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
