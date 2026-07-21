import type { EntityTypeRef } from "../../entities/types.js"

/**
 * An entity's involvement in a template — why the entity is involved, kept
 * separate from the entity's own type. The entity link is the writable FK; the
 * involvement type is a free-text reason. Mirrors the work-order surface; carries
 * forward to a synced work order. No money/direction by design.
 */
export type TemplateEntityInvolvementRow = {
  id: string
  // Optional entity link — the writable FK.
  entityId: string | null
  // Read-only hydration off the entity link (never round-trips on save): the
  // linked entity's name + its type chip. Null when unlinked.
  entityName: string | null
  entityType: EntityTypeRef | null
  // Free-text reason the entity is involved; "" when unset (persisted as NULL).
  involvementType: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. Carried on the row but not
  // surfaced in the section table — DB-only by design.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplateEntityInvolvementForm = {
  // Optional entity link (null = unlinked). The only writable link field —
  // entityName/entityType are read-only hydration and never enter the form.
  entityId: string | null
  // Free-text reason; "" = unset (persisted as NULL).
  involvementType: string
}
