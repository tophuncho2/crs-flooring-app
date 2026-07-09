import { isValidMoneyAmount } from "../../shared/money.js"
import type { WorkOrderPlannedPaymentForm } from "./types.js"

// Amount is REQUIRED and must be a positive money value (mirrors validatePaymentForm:
// present → valid money → greater than zero). Direction must be a known value.
// Returns "" when valid, else a human message (the child-section convention).
export function validateWorkOrderPlannedPaymentForm(input: WorkOrderPlannedPaymentForm) {
  const raw = input.amount.trim()
  if (raw.length === 0) return "Amount is required"
  if (!isValidMoneyAmount(raw)) return "Amount must be a valid amount"
  if (Number(raw) <= 0) return "Amount must be greater than zero"
  if (input.direction !== "REVENUE" && input.direction !== "EXPENSE") {
    return "Direction (revenue or expense) is required"
  }
  return ""
}
