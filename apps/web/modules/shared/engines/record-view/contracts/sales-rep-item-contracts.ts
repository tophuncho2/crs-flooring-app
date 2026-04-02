import { isEditableDecimalInput } from "./child-item-validation"
import { calculateRecordSalesRepLineAmount } from "./record-sales-reps"
import type { FieldErrorMap } from "../feedback/record-field-errors"

export type SalesRepOption = {
  id: string
  name: string
}

export type EditableSalesRepItem = {
  id: string
  contactId: string
  contactName: string
  percent: string
  updatedAt: string
}

export type SalesRepDraft = {
  contactId: string
  percent: string
}

export type SalesRepField = "contactId" | "percent"
export type SalesRepFieldErrors = FieldErrorMap<SalesRepField>

export function calculateSalesRepAmount(customerCost: number, percent: string) {
  return calculateRecordSalesRepLineAmount(customerCost, { percent })
}

export function validateSalesRepFields(value: Pick<SalesRepDraft, "contactId" | "percent">) {
  const errors: SalesRepFieldErrors = {}

  if (!value.contactId.trim()) {
    errors.contactId = "Select a sales rep."
  }

  if (!value.percent.trim()) {
    errors.percent = "Enter a percent."
  } else {
    const percent = Number(value.percent)
    if (!isEditableDecimalInput(value.percent, 2) || !Number.isFinite(percent)) {
      errors.percent = "Enter a valid percent with up to 2 decimals."
    } else if (percent < 0 || percent > 100) {
      errors.percent = "Percent must be between 0 and 100."
    }
  }

  return errors
}
