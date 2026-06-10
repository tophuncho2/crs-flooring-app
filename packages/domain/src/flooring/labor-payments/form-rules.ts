import type { LaborPaymentForm } from "./types.js"

export function validateLaborPaymentForm(input: LaborPaymentForm) {
  if (!input.contactId.trim()) return "A contact is required"
  return ""
}
