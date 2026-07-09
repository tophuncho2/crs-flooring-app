import type { FlooringPaymentDirection } from "../../payments/types.js"

/**
 * An invoice item on a template. A structural mirror of
 * TemplatePlannedPaymentRow but a DELIBERATELY SMALLER shape: `amount` is the
 * unsigned money-of-record string (the money standard), `direction` carries the
 * sign, and `notes` is short free-text. NO entity link — the invoice side
 * diverges from the planned side by design.
 */
export type TemplateInvoiceItemRow = {
  id: string
  // Unsigned canonical money string ("10.00"); direction carries the sign.
  amount: string
  direction: FlooringPaymentDirection
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

export type TemplateInvoiceItemForm = {
  // Required, unsigned money amount; normalized at the write boundaries.
  amount: string
  direction: FlooringPaymentDirection
  // Short free-text note; "" = unset (persisted as NULL).
  notes: string
}

export const EMPTY_TEMPLATE_INVOICE_ITEM_FORM: TemplateInvoiceItemForm = {
  amount: "",
  direction: "REVENUE",
  notes: "",
}
