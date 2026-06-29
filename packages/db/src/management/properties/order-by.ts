import type { Prisma } from "../../generated/prisma/client.js"
import type { PropertiesListSort } from "./read-repository.js"

/**
 * Pure properties list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildPropertiesOrderBy`; the rest is internal.
 */

export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `entity` sorts through the linked entity's name (`entity.entity`);
// everything else is a plain scalar sort. Returns `undefined` for unknown fields
// so the caller can skip them. Row# (`propertyNumber`) is intentionally NOT
// sortable — chronological `createdAt` is the canonical time key.
export function propertyFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.PropertyOrderByWithRelationInput | undefined {
  switch (field) {
    case "name":
      return { name: direction }
    case "entity":
      return { entity: { entity: direction } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the properties list-view `orderBy`. The user-selectable fields are
 * `name`, `entity` (→ entity.entity), `createdAt` and `updatedAt`. The list page
 * seeds `name ASC` as its default; the record-view property sections seed
 * `createdAt DESC`. Multiple columns compose an ordered chain (highest priority
 * first), mirroring work orders / inventory. `id` is always the stable final
 * tiebreak.
 */
export function buildPropertiesOrderBy(
  sort: PropertiesListSort | undefined,
): Prisma.PropertyOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, propertyFieldOrderBy(entry.field, entry.direction))
  }

  // Deterministic tiebreak. Its direction mirrors the highest-priority entry so
  // the trailing order matches the leading column; with no entries it falls back
  // to `asc` (the name-asc default). Skip the createdAt tiebreak when the user
  // already sorts by it — its own clause is already in the chain. `id` is always
  // appended last as the unique final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
