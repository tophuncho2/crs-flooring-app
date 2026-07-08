import { isValidMoneyAmount } from "../../shared/money.js"
import type { TemplatePlannedProductForm } from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero.
// Cost is optional too — blank = unset; when present it must be a valid money
// amount (0 allowed, unlike quantity).
export function validateTemplatePlannedProductForm(input: TemplatePlannedProductForm) {
  if (!input.productId) return "Product is required"
  if (input.cost.trim() && !isValidMoneyAmount(input.cost)) {
    return "Cost must be a valid amount"
  }
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
