import type { Prisma } from "../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../shared/order-by.js"
import type { InventoryListViewSort } from "./read-repository.js"

/**
 * Pure inventory list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildInventoryListViewOrderBy`; the rest is internal.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `location` is nullable, so it is ordered explicitly with nulls last;
// `stockBalance` (the displayed quantity) sorts on the generated `stockQuantity`
// column. Returns `undefined` for unknown fields so the caller can skip them.
export function inventoryFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringInventoryOrderByWithRelationInput | undefined {
  switch (field) {
    case "location":
      return { location: { sort: direction, nulls: "last" } }
    case "stockBalance":
      return { stockQuantity: direction }
    case "productName":
      return { product: { name: direction } }
    case "warehouse":
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
 * Builds the inventory list-view `orderBy`. Default sort is `createdAt DESC`
 * (newest first); `id` is the stable final tiebreak in the same direction. The
 * user-selectable fields are `createdAt`, `updatedAt`, `location` (nullable →
 * nulls last), `stockBalance` (the displayed quantity, sorted on the generated
 * `stockQuantity` column), `productName` (→ product.name) and `warehouse`
 * (→ warehouse.name). Row# (`inventoryNumber`) is intentionally NOT sortable —
 * chronological `createdAt` is the canonical time key. Multiple columns compose
 * an ordered chain (highest priority first), mirroring work orders.
 */
export function buildInventoryListViewOrderBy(
  sort: InventoryListViewSort | undefined,
): Prisma.FlooringInventoryOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringInventoryOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. `appendUniqueOrderBy`
  // drops an identical duplicate clause (field-level dedup happens upstream in
  // the sort parsers); the builder trusts it receives distinct fields.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, inventoryFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  // Deterministic tiebreak for a user-applied sort. Its direction mirrors the
  // highest-priority entry so the trailing order matches the leading column.
  // Skip the createdAt tiebreak when the user already sorts by it — its own
  // clause is already in the chain. `id` is always appended last as the unique
  // final tiebreak.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "desc"
  if (!entries.some((entry) => entry.field === "createdAt")) {
    appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  }
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
