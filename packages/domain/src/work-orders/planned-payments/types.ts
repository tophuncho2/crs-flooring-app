import type { FlooringPaymentDirection } from "../../payments/types.js"
import type { EntityTypeRef } from "../../entities/types.js"

/**
 * A planned payment on a work order. Field-shape mirrors a standalone payment:
 * `amount` is the unsigned money-of-record string (the money standard) and
 * `direction` carries the sign. The entity link is the writable FK.
 */
export type WorkOrderPlannedPaymentRow = {
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
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. Carried on the row but not
  // surfaced in the section table — DB-only by design.
  createdBy: string | null
  updatedBy: string | null
}

export type WorkOrderPlannedPaymentForm = {
  // Required, unsigned money amount; normalized at the write boundaries.
  amount: string
  direction: FlooringPaymentDirection
  // Short free-text note; "" = unset (persisted as NULL).
  notes: string
  // Optional entity link (null = unlinked). The only writable link field —
  // entityName/entityTypes are read-only hydration and never enter the form.
  entityId: string | null
}
