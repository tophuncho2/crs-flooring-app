import type { FlooringPaymentDirection } from "../../payments/types.js"
import type { EntityTypeRef } from "../../entities/types.js"
import type { PaletteColor } from "../../shared/palette.js"

/**
 * A planned payment on a template. Field-shape mirrors a standalone payment:
 * `amount` is the unsigned money-of-record string (the money standard) and
 * `direction` carries the sign. The entity link is the writable FK.
 */
export type TemplatePlannedPaymentRow = {
  id: string
  // Unsigned canonical money string ("10.00"); direction carries the sign.
  amount: string
  direction: FlooringPaymentDirection
  // Short free-text note; "" when unset (persisted as NULL).
  notes: string
  // Optional entity link — the writable FK.
  entityId: string | null
  // Read-only hydration off the entity link (never round-trips on save): the
  // linked entity's name + its type chips. Null/empty when unlinked.
  entityName: string | null
  entityTypes: EntityTypeRef[]
  // Optional payment-purpose link — the writable FK.
  paymentPurposeId: string | null
  // Read-only hydration off the purpose link (never round-trips on save): the
  // linked purpose's name + palette color for the chip. Null when unlinked.
  paymentPurposeName: string | null
  paymentPurposeColor: PaletteColor | null
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
  // Short free-text note; "" = unset (persisted as NULL).
  notes: string
  // Optional entity link (null = unlinked). The only writable link field —
  // entityName/entityTypes are read-only hydration and never enter the form.
  entityId: string | null
  // Optional payment-purpose link (null = unlinked). Writable FK —
  // paymentPurposeName/Color are read-only hydration and never enter the form.
  paymentPurposeId: string | null
}
