import type { FlooringPaymentDirection } from "../../payments/types.js"

/**
 * A planned payment on a template. Field-shape mirrors a standalone payment:
 * `amount` is the unsigned money-of-record string (the money standard) and
 * `direction` carries the sign. `paymentDate` is surfaced as an empty string when
 * unset so the UI never juggles `null`. The entity link arrives in a later pass.
 */
export type TemplatePlannedPaymentRow = {
  id: string
  // Unsigned canonical money string ("10.00"); direction carries the sign.
  amount: string
  direction: FlooringPaymentDirection
  paymentDate: string
  // Short free-text note; "" when unset (persisted as NULL).
  notes: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. Carried on the row but not
  // surfaced in the section table — DB-only by design.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplatePlannedPaymentForm = {
  // Required, unsigned money amount; normalized at the write boundaries.
  amount: string
  direction: FlooringPaymentDirection
  // "" = unset (persisted as NULL).
  paymentDate: string
  // Short free-text note; "" = unset (persisted as NULL).
  notes: string
}

export const EMPTY_TEMPLATE_PLANNED_PAYMENT_FORM: TemplatePlannedPaymentForm = {
  amount: "",
  direction: "REVENUE",
  paymentDate: "",
  notes: "",
}
