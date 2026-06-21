export type FlooringPaymentDirection = "INFLOW" | "OUTFLOW"

/**
 * A standalone payment row. `amount` is the unsigned currency-of-record string
 * (the money standard); `direction` carries the sign. Nullable DB columns are
 * surfaced as empty strings so the UI never juggles `null`.
 */
export type Payment = {
  id: string
  paymentNumber: string
  amount: string
  direction: FlooringPaymentDirection
  paymentType: string
  paymentMethod: string
  paymentDate: string
  memo: string
  createdAt: string
  updatedAt: string
}

export type PaymentListRow = Payment

export type PaymentPage = {
  rows: PaymentListRow[]
  total: number
}

export type PaymentForm = {
  amount: string
  direction: FlooringPaymentDirection
  paymentType: string
  paymentMethod: string
  paymentDate: string
  memo: string
}

export const EMPTY_PAYMENT_FORM: PaymentForm = {
  amount: "",
  direction: "INFLOW",
  paymentType: "",
  paymentMethod: "",
  paymentDate: "",
  memo: "",
}

export function toPaymentForm(payment: Payment): PaymentForm {
  return {
    amount: payment.amount,
    direction: payment.direction,
    paymentType: payment.paymentType,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    memo: payment.memo,
  }
}

// No FK / entity filtering this slice — the list is unfiltered (newest-first).
export type PaymentListFilters = Record<string, never>
