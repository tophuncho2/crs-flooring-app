import type { Prisma } from "../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../shared/order-by.js"
import type { WorkOrdersListSort } from "./read-repository.js"

/**
 * Pure work-orders list `orderBy` builder. Kept free of the Prisma *client* (only
 * `import type`) so it unit-tests without a DB connection. `read-repository`
 * consumes `buildWorkOrdersOrderBy`; the rest is internal.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `scheduledFor` + `timeOfDay` are nullable, so they are ordered
// explicitly with nulls last; everything else is a plain relation/scalar sort.
// Returns `undefined` for unknown fields so the caller can skip them.
export function workOrderFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringWorkOrderOrderByWithRelationInput | undefined {
  switch (field) {
    case "scheduledFor":
      return { scheduledFor: { sort: direction, nulls: "last" } }
    case "workOrderNumber":
      return { workOrderNumber: direction }
    case "property":
      return { property: { name: direction } }
    case "entity":
      return { property: { entity: { entity: direction } } }
    case "jobType":
      return { jobType: { name: direction } }
    case "warehouse":
      return { warehouse: { name: direction } }
    case "timeOfDay":
      return { timeOfDay: { sort: direction, nulls: "last" } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    case "unitNumber":
      return { unitNumber: direction }
    case "unitType":
      return { unitType: direction }
    default:
      return undefined
  }
}

export function buildWorkOrdersOrderBy(
  sort: WorkOrdersListSort | undefined,
): Prisma.FlooringWorkOrderOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringWorkOrderOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, workOrderFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  // Deterministic tiebreak for a user-applied sort. Its direction mirrors the
  // highest-priority entry so the trailing order matches the leading column.
  // Skip the createdAt tiebreak when the user already sorts by it — its own
  // clause (with the user's direction) is already in the chain. `id` is always
  // appended last as the unique final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
