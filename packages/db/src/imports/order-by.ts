import type { Prisma } from "../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../shared/order-by.js"
import type { ImportsListSort } from "./read-repository.js"

/**
 * Pure imports list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildImportsOrderBy`; the rest is internal.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. This pass exposes only the two timestamp scalars; the warehouse/entity
// relation sorts land in a separate sweep. Returns `undefined` for unknown fields
// so the caller can skip them. Row# (`importNumber`) is intentionally NOT
// user-sortable — it is reserved as the deterministic tiebreak below.
export function importFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringImportEntryOrderByWithRelationInput | undefined {
  switch (field) {
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the imports list-view `orderBy`. The user-selectable fields are
 * `createdAt` and `updatedAt`. Multiple columns compose an ordered chain
 * (highest priority first). The tiebreak is `importNumber` (the `@unique`
 * autoincrement int) then `id`: `createdAt` ties on rows created in the same
 * transaction (batched seed/materialize paths), so `importNumber` — monotonic
 * and unique — is the deterministic secondary key that keeps the visible order
 * stable. With no user sort the list falls back to the uniform invisible base
 * order (`createdAt desc, id desc`); since `importNumber` is monotonic with
 * creation, the visible newest-first order is unchanged.
 */
export function buildImportsOrderBy(
  sort: ImportsListSort | undefined,
): Prisma.FlooringImportEntryOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringImportEntryOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, importFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  // Deterministic tiebreak for a user-applied sort. Its direction mirrors the
  // highest-priority entry so the trailing order matches the leading column.
  // `importNumber` is never user-sortable, so it is always appended; `id` is the
  // final unique tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "desc"
  appendUniqueOrderBy(orderBy, { importNumber: tiebreakDirection })
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
