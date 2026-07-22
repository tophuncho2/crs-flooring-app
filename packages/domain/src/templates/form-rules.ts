import { isValidMoneyAmount } from "../shared/money.js"
import { isValidTaxRate, TAX_RATE_INVALID_MESSAGE } from "./tax.js"
import type { TemplateDetail, TemplateForm } from "./types.js"

export function validateTemplateForm(input: TemplateForm) {
  // Property is optional — a template always has an auto-generated number, so a
  // record is never empty even with no property. Unit type stays required: it is
  // the defining attribute of a template.
  if (!input.unitType.trim()) return "Unit type is required"
  // Total transaction is optional (nullable money). When present it must be a
  // valid amount — the MoneyCell normalizes on blur, this is the defensive guard.
  if (input.totalTransaction.trim() && !isValidMoneyAmount(input.totalTransaction)) {
    return "Total transaction must be a valid amount"
  }
  // Tax rate is optional (nullable percent). When present it must be a valid rate
  // (≤ 100, ≤ 3 decimals) — the NumberCell edits it, this is the defensive guard.
  if (input.taxRate.trim() && !isValidTaxRate(input.taxRate)) {
    return TAX_RATE_INVALID_MESSAGE
  }
  return ""
}

export function toTemplateForm(template: TemplateDetail): TemplateForm {
  return {
    propertyId: template.propertyId ?? "",
    jobTypeId: template.jobTypeId ?? "",
    warehouseId: template.warehouseId ?? "",
    unitType: template.unitType,
    customerName: template.customerName,
    description: template.description,
    internalNotes: template.internalNotes,
    installerInstructions: template.installerInstructions,
    totalTransaction: template.totalTransaction,
    taxRate: template.taxRate,
    color: template.color,
  }
}
