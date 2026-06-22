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
  paymentDate: string
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
  paymentDate: string
}

export const EMPTY_PAYMENT_FORM: PaymentForm = {
  amount: "",
  direction: "INFLOW",
  paymentDate: "",
}

export function toPaymentForm(payment: Payment): PaymentForm {
  return {
    amount: payment.amount,
    direction: payment.direction,
    paymentDate: payment.paymentDate,
  }
}

// No FK / entity filtering this slice — the list is unfiltered (newest-first).
export type PaymentListFilters = Record<string, never>
