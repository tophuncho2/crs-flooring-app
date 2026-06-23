export type FlooringPaymentDirection = "REVENUE" | "EXPENSE"

/**
 * A standalone payment row. `amount` is the unsigned currency-of-record string
 * (the money standard); `direction` carries the sign. Nullable DB columns are
 * surfaced as empty strings so the UI never juggles `null`.
 */
export type Payment = {
  id: string
  paymentNumber: string
  paymentNumberInt?: number
  amount: string
  direction: FlooringPaymentDirection
  paymentDate: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type PaymentListRow = Payment

/**
 * An adjacent payment in the global payment-number sequence
 * (`paymentNumberInt`). Carries only `id` — the record-view stepper navigates
 * straight to the neighbor record by number. Null at the ends of the sequence.
 */
export type PaymentNeighbor = {
  id: string
}

export type PaymentDetail = Payment & {
  /**
   * Neighbors by global payment-number order (`paymentNumberInt`), ignoring any
   * list filters — powers the record-view shell stepper (◀ PAY-# ▶). Null when
   * the current row is at the start/end of the sequence.
   */
  previousPayment: PaymentNeighbor | null
  nextPayment: PaymentNeighbor | null
}

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
  direction: "REVENUE",
  paymentDate: "",
}

export function toPaymentForm(payment: Payment): PaymentForm {
  return {
    amount: payment.amount,
    direction: payment.direction,
    paymentDate: payment.paymentDate,
  }
}

// Per-field identity search. `paymentNumber` is a free-text bar matched exactly
// against the generated `paymentNumberInt` column (digits stripped server-side).
// `amount` is a free-text bar matched exactly against the `amount` column
// (parsed/canonicalized via `normalizeMoneyAmount` server-side).
export type PaymentListFilters = {
  paymentNumber?: string
  amount?: string
}
