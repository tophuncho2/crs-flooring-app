import {
  EMPTY_LABOR_PAYMENT_FORM,
  toLaborPaymentForm,
  type LaborPayment,
} from "@builders/domain"
import type {
  LaborPaymentCreateSeed,
  LaborPaymentEditForm,
  LaborPaymentEditLocal,
} from "./types"

export const EMPTY_FORM: LaborPaymentEditForm = { ...EMPTY_LABOR_PAYMENT_FORM }
export const EMPTY_LOCAL: LaborPaymentEditLocal = { contactLabel: "" }

export function buildCreateForm(seed: LaborPaymentCreateSeed): LaborPaymentEditForm {
  return { ...EMPTY_LABOR_PAYMENT_FORM, contactId: seed.contactId }
}

export function buildCreateLocal(seed: LaborPaymentCreateSeed): LaborPaymentEditLocal {
  return { contactLabel: seed.contactName }
}

export function buildEditForm(laborPayment: LaborPayment): LaborPaymentEditForm {
  return toLaborPaymentForm(laborPayment)
}

export function buildEditLocal(laborPayment: LaborPayment): LaborPaymentEditLocal {
  return { contactLabel: laborPayment.contactName }
}

export function formIsDirty(
  form: LaborPaymentEditForm,
  baseline: LaborPaymentEditForm,
): boolean {
  return (
    form.contactId !== baseline.contactId ||
    form.unit !== baseline.unit ||
    form.description !== baseline.description ||
    form.cost !== baseline.cost
  )
}

export function isFormValid(form: LaborPaymentEditForm): boolean {
  return form.contactId.trim().length > 0
}
