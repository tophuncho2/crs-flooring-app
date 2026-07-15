import type { Prisma } from "../generated/prisma/client.js"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../shared/order-by.js"
import { productAttributeOrderBy } from "./product-list-filters.js"
import type { ProductListViewSort } from "./read-repository.js"

/**
 * Pure products list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildProductListViewOrderBy`; the rest is internal.
 */

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `category` sorts on the related category name; `style`/`color` are
// nullable free-text so they are ordered explicitly with nulls last. Returns
// `undefined` for unknown fields so the caller can skip them.
export function productFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringProductOrderByWithRelationInput | undefined {
  switch (field) {
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    // category / style / color share one source with the linked-table lists.
    default:
      return productAttributeOrderBy(field, direction)
  }
}

/**
 * Builds the products list-view `orderBy`. With no user-selected columns it
 * falls back to the uniform invisible base order (`createdAt desc, id desc`) —
 * newest first, nothing reads as sorted on load. The user-selectable fields are
 * `category` (→ category.name), `style`/`color` (nullable free-text → nulls
 * last), `createdAt` and `updatedAt`.
 *
 * `name` (the product name) is products' canonical SECONDARY key for a
 * user-applied sort — the analog of inventory's `createdAt` tiebreak. It is
 * appended after the user's columns (unless they already sort by it) so a lone
 * `category` selection reproduces the familiar `category.name → name → id`
 * grouping, and every other sort stays alphabetically stable within ties. `id`
 * is always the unique final tiebreak; both trailing clauses mirror the
 * highest-priority column's direction.
 */
export function buildProductListViewOrderBy(
  sort: ProductListViewSort | undefined,
): Prisma.FlooringProductOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringProductOrderByWithRelationInput[] = []
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, productFieldOrderBy(entry.field, entry.direction))
  }

  // No user sort (nothing selected, or every selected field was unknown and
  // dropped) → the uniform invisible base order (`createdAt desc, id desc`).
  if (orderBy.length === 0) return [...DEFAULT_LIST_ORDER]

  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  // Products' canonical secondary key. Skip it when the user already sorts by
  // name — it is not a selectable Sort field today, so this stays defensive.
  if (!entries.some((entry) => entry.field === "name")) {
    appendUniqueOrderBy(orderBy, { name: tiebreakDirection })
  }
  // `id` is always appended last as the unique final tiebreak.
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
