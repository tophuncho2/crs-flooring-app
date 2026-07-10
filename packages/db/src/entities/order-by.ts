import type { Prisma } from "../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../shared/order-by.js"
import type { EntitiesListSort } from "./read-repository.js"

/**
 * Pure entities list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildEntitiesOrderBy`; the rest is internal.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `state` is nullable, so nulls sink last regardless of direction.
// Returns `undefined` for unknown fields so the caller can skip them. Row#
// (`entityNumber`) is intentionally NOT sortable — chronological `createdAt` is
// the canonical time key; `types` is a to-many relation Prisma can't order by
// name, so it is absent here too.
export function entityFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.EntityOrderByWithRelationInput | undefined {
  switch (field) {
    case "entity":
      return { entity: direction }
    case "state":
      return { state: { sort: direction, nulls: "last" } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the entities list-view `orderBy`. The user-selectable fields are
 * `entity`, `state` (nulls last), `createdAt` and `updatedAt`. The list page
 * seeds `entity ASC` as its default. Multiple columns compose an ordered chain
 * (highest priority first), mirroring properties / work orders. `id` is always
 * the stable final tiebreak.
 */
export function buildEntitiesOrderBy(
  sort: EntitiesListSort | undefined,
): Prisma.EntityOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.EntityOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, entityFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  // Deterministic tiebreak for a user-applied sort. Its direction mirrors the
  // highest-priority entry so the trailing order matches the leading column.
  // Skip the createdAt tiebreak when the user already sorts by it — its own
  // clause is already in the chain. `id` is always appended last as the unique
  // final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
