export type LaborPayment = {
  id: string
  contactId: string
  contactName: string
  workOrderId: string
  workOrderNumber: string
  unit: string
  description: string
  cost: string
  createdAt: string
  updatedAt: string
}

export type LaborPaymentListRow = LaborPayment

export type LaborPaymentPage = {
  rows: LaborPaymentListRow[]
  hasMore: boolean
}

export type LaborPaymentForm = {
  contactId: string
  workOrderId: string
  unit: string
  description: string
  cost: string
}

export const EMPTY_LABOR_PAYMENT_FORM: LaborPaymentForm = {
  contactId: "",
  workOrderId: "",
  unit: "",
  description: "",
  cost: "",
}

export function toLaborPaymentForm(laborPayment: LaborPayment): LaborPaymentForm {
  return {
    contactId: laborPayment.contactId,
    workOrderId: laborPayment.workOrderId,
    unit: laborPayment.unit,
    description: laborPayment.description,
    cost: laborPayment.cost,
  }
}
