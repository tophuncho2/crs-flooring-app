import type { Prisma } from "../../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../../shared/order-by.js"
import { productRelationAttributeOrderBy } from "../../products/product-list-filters.js"
import type { AdjustmentsListViewSort } from "./read-repository.js"

/**
 * Pure adjustments list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection. Mirrors the
 * inventory builder; reuses the shared `appendUniqueOrderBy` helper.
 * `read-repository` consumes `buildAdjustmentsListViewOrderBy`.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `location` is nullable, so it is ordered explicitly with nulls last;
// `productName` sorts on the live `product.name` relation (adjustments carry no
// product snapshot column). Returns `undefined` for unknown fields so the caller
// can skip them.
export function adjustmentFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringInventoryAdjustmentOrderByWithRelationInput | undefined {
  switch (field) {
    case "location":
      return { location: { sort: direction, nulls: "last" } }
    case "productName":
      return { product: { name: direction } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    // category / style / color resolve through the product relation — shared with
    // the Products list and the other product-linked lists.
    default:
      return productRelationAttributeOrderBy(field, direction)
  }
}

/**
 * Builds the adjustments ledger list-view `orderBy`. Default sort is
 * `createdAt DESC` (newest first); `id` (rowid) is ALWAYS the stable final
 * tiebreak in the lead column's direction. The user-selectable fields are
 * `createdAt`, `updatedAt`, `location` (nullable → nulls last) and `productName`
 * (→ product.name). Multiple columns compose an ordered chain (highest priority
 * first), mirroring inventory + work orders.
 */
export function buildAdjustmentsListViewOrderBy(
  sort: AdjustmentsListViewSort | undefined,
): Prisma.FlooringInventoryAdjustmentOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringInventoryAdjustmentOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, adjustmentFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  // Deterministic tiebreak for a user-applied sort. Its direction mirrors the
  // highest-priority entry so the trailing order matches the leading column.
  // Skip the createdAt tiebreak when the user already sorts by it — its own
  // clause is already in the chain. `id` (rowid) is always appended last as the
  // unique final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "desc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
