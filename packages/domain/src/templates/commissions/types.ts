import type { EntityTypeRef } from "../../entities/types.js"

/**
 * A sales-rep commission line on a template — the THIRD table in the "products"
 * record section. The entity link is a label-only writable FK (who the rep is); it
 * does NOT drive the math. `percent` is a manual scale-3 percent. The line total
 * (percent × the template's Net Cost) is derived at the ledger/grid level — Net Cost
 * is cross-row, so it is NOT a per-row field here.
 */
export type TemplateCommissionRow = {
  id: string
  // Optional entity link — the writable FK (the sales rep). null = unlinked.
  entityId: string | null
  // Read-only hydration off the entity link (never round-trips on save): the linked
  // entity's name + its type chip. Null when unlinked. Mirrors the planned-payment
  // entity hydration.
  entityName: string | null
  entityType: EntityTypeRef | null
  // Manual commission rate as a canonical scale-3 percent string ("5.000"; "" =
  // unset). Sent in the diff. The per-row basis for the line total (× Net Cost).
  percent: string
  // Short free-text note; "" when unset (persisted NULL). Sent in the diff.
  notes: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. DB-only — not surfaced in the table.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplateCommissionForm = {
  // Optional entity link (null = unlinked). The only writable link field —
  // entityName/entityType are read-only hydration and never enter the form.
  entityId: string | null
  // Manual scale-3 percent ("" = unset, stored NULL). Validated when present.
  percent: string
  // Short free-text note; "" = unset (persisted NULL).
  notes: string
}
