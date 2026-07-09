import type { EntityTypeRef } from "../entities/types.js"
import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type FlooringPaymentDirection = "REVENUE" | "EXPENSE"

/**
 * A standalone payment row. `amount` is the unsigned currency-of-record string
 * (the money standard); `direction` carries the sign. Nullable DB columns are
 * surfaced as empty strings so the UI never juggles `null`.
 *
 * `entityId` / `workOrderId` are the optional, single links to an entity and a
 * work order (both `null` when unlinked). The `entityName` / `workOrderLabel` /
 * `entityTypes` fields are READ-ONLY hydration off those links — projected by the
 * detail read so the record-view pickers can show the current trigger label and
 * the linked entity's type chips. They never round-trip on save.
 */
export type Payment = {
  id: string
  paymentNumber: string
  paymentNumberInt?: number
  amount: string
  direction: FlooringPaymentDirection
  // Non-semantic palette tag. Metadata only — never feeds any computation.
  color: PaletteColor
  // Free-text method label ("Cash", "Check #…", "ACH"). Nullable DB column
  // surfaced as "" so the UI never juggles null.
  paymentMethod: string
  paymentDate: string
  entityId: string | null
  workOrderId: string | null
  entityName: string | null
  // `workOrderNumber` is the bare WO-N (list column); `workOrderLabel` is the
  // richer "#WO-N · property · unitType" string the record-view picker trigger reads.
  workOrderNumber: string | null
  workOrderLabel: string | null
  entityTypes: EntityTypeRef[]
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
  color: PaletteColor
  paymentMethod: string
  paymentDate: string
  entityId: string | null
  workOrderId: string | null
}

export const EMPTY_PAYMENT_FORM: PaymentForm = {
  amount: "",
  direction: "REVENUE",
  color: DEFAULT_PALETTE_COLOR,
  paymentMethod: "",
  paymentDate: "",
  entityId: null,
  workOrderId: null,
}

export function toPaymentForm(payment: Payment): PaymentForm {
  return {
    amount: payment.amount,
    direction: payment.direction,
    color: payment.color,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    entityId: payment.entityId,
    workOrderId: payment.workOrderId,
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
