import type { Prisma } from "../../generated/prisma/client.js"
import type { TemplatesListSort } from "./read-repository.js"

/**
 * Pure templates list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildTemplatesOrderBy`; the rest is internal.
 */

export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `property` sorts through the linked property's name; `entity` sorts
// through the property's entity name (2-hop); `unitType` is a plain scalar.
// Returns `undefined` for unknown fields so the caller can skip them. Row#
// (`templateNumber`) is intentionally NOT sortable — chronological `createdAt`
// is the canonical time key.
export function templateFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.TemplateOrderByWithRelationInput | undefined {
  switch (field) {
    case "property":
      return { property: { name: direction } }
    case "entity":
      return { property: { entity: { entity: direction } } }
    case "unitType":
      return { unitType: direction }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the templates list-view `orderBy`. The user-selectable fields are
 * `property` (→ property.name), `entity` (→ property.entity.entity), `unitType`,
 * `createdAt` and `updatedAt`. The list page seeds `property ASC` as its default;
 * the record-view template sections seed `createdAt DESC`. Multiple columns
 * compose an ordered chain (highest priority first), mirroring work orders /
 * inventory. `id` is always the stable final tiebreak.
 */
export function buildTemplatesOrderBy(
  sort: TemplatesListSort | undefined,
): Prisma.TemplateOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.TemplateOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, templateFieldOrderBy(entry.field, entry.direction))
  }

  // Deterministic tiebreak. Its direction mirrors the highest-priority entry so
  // the trailing order matches the leading column; with no entries it falls back
  // to `asc` (the property-asc default). Skip the createdAt tiebreak when the
  // user already sorts by it — its own clause is already in the chain. `id` is
  // always appended last as the unique final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
