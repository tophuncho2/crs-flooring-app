import { validatePlannedPaymentForm } from "../../shared/planned-payment-rules.js"
import type { WorkOrderPlannedPaymentForm } from "./types.js"

// Amount is REQUIRED and must be a positive money value; direction must be a known
// value. Returns "" when valid, else a human message (the child-section convention).
// Shares the rule with the template planned-payment section.
export function validateWorkOrderPlannedPaymentForm(input: WorkOrderPlannedPaymentForm) {
  return validatePlannedPaymentForm(input)
}
