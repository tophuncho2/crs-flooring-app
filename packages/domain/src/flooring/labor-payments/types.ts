export type LaborPayment = {
  id: string
  contactId: string
  contactName: string
  unit: string
  description: string
  cost: string
  createdAt: string
  updatedAt: string
}

export type LaborPaymentListRow = LaborPayment

export type LaborPaymentForm = {
  contactId: string
  unit: string
  description: string
  cost: string
}

export const EMPTY_LABOR_PAYMENT_FORM: LaborPaymentForm = {
  contactId: "",
  unit: "",
  description: "",
  cost: "",
}

export function toLaborPaymentForm(laborPayment: LaborPayment): LaborPaymentForm {
  return {
    contactId: laborPayment.contactId,
    unit: laborPayment.unit,
    description: laborPayment.description,
    cost: laborPayment.cost,
  }
}
