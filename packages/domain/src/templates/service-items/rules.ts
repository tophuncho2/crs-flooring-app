import { isValidMoneyAmount } from "../../shared/money.js"
import type { TemplateServiceItemForm } from "./types.js"

// A service / misc line item has NO required fields — itemType + itemName are
// free-text and optional. The money fields (bidCost/tax) are optional; a provided
// value must be a valid money amount (defense — the API validator normalizes too).
// Quantity is optional; a provided value must be a finite number greater than zero.
export function validateTemplateServiceItemForm(input: TemplateServiceItemForm) {
  const moneyFields: Array<[string, string]> = [
    ["Bid cost", input.bidCost],
    ["Tax", input.tax],
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
