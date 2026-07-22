import { isValidMoneyAmount } from "../../shared/money.js"
import type { TemplatePlannedProductForm } from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero.
// The job-costing money fields (tax/freight) are optional; a provided value must
// be a valid money amount (defense — the API validator normalizes too).
export function validateTemplatePlannedProductForm(input: TemplatePlannedProductForm) {
  if (!input.productId) return "Product is required"
  const moneyFields: Array<[string, string]> = [
    ["Tax", input.tax],
    ["Freight", input.freight],
  ]
  for (const [label, value] of moneyFields) {
    if (value.trim() && !isValidMoneyAmount(value)) {
      return `${label} must be a valid amount`
    }
  }
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
