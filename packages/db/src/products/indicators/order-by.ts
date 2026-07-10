import type { Prisma } from "../../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../../shared/order-by.js"
import type { IndicatorsListViewSort } from "./read-repository.js"

/**
 * Pure inventory-indicators list-view `orderBy` builder. Kept free of the Prisma
 * *client* (only `import type`) so it unit-tests without a DB connection. Mirrors
 * the adjustments builder; reuses the shared `appendUniqueOrderBy` helper.
 * `read-repository` consumes `buildIndicatorsListViewOrderBy`.
 */
export function indicatorFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringInventoryIndicatorOrderByWithRelationInput | undefined {
  switch (field) {
    case "productName":
      return { product: { name: direction } }
    case "warehouseName":
      return { warehouse: { name: direction } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the indicators list-view `orderBy`. Default sort is `createdAt DESC`
 * (newest first); `id` (rowid) is ALWAYS the stable final tiebreak in the lead
 * column's direction. Multiple columns compose an ordered chain (highest priority
 * first), mirroring inventory + adjustments.
 */
export function buildIndicatorsListViewOrderBy(
  sort: IndicatorsListViewSort | undefined,
): Prisma.FlooringInventoryIndicatorOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringInventoryIndicatorOrderByWithRelationInput[] = []

  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, indicatorFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "desc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
