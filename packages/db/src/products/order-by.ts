import type { Prisma } from "../generated/prisma/client.js"
import type { ProductListViewSort } from "./read-repository.js"

/**
 * Pure products list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildProductListViewOrderBy`; the rest is internal.
 */

export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `category` sorts on the related category name; `style`/`color` are
// nullable free-text so they are ordered explicitly with nulls last. Returns
// `undefined` for unknown fields so the caller can skip them.
export function productFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringProductOrderByWithRelationInput | undefined {
  switch (field) {
    case "category":
      return { category: { name: direction } }
    case "style":
      return { style: { sort: direction, nulls: "last" } }
    case "color":
      return { color: { sort: direction, nulls: "last" } }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

// The default order applied when the user has selected no sort columns. Matches
// the historical hardcoded product list order (category name, then product
// name, then id) so the unsorted view is byte-identical to before the install.
const PRODUCT_DEFAULT_ORDER_BY: Prisma.FlooringProductOrderByWithRelationInput[] = [
  { category: { name: "asc" } },
  { name: "asc" },
  { id: "asc" },
]

/**
 * Builds the products list-view `orderBy`. With no user-selected columns it
 * returns the default `category.name → name → id` chain (unchanged behavior).
 * The user-selectable fields are `category` (→ category.name), `style`/`color`
 * (nullable free-text → nulls last), `createdAt` and `updatedAt`. Multiple
 * columns compose an ordered chain (highest priority first); `id` is always the
 * stable final tiebreak, its direction mirroring the highest-priority column.
 */
export function buildProductListViewOrderBy(
  sort: ProductListViewSort | undefined,
): Prisma.FlooringProductOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  if (entries.length === 0) {
    return PRODUCT_DEFAULT_ORDER_BY.map((clause) => ({ ...clause }))
  }

  const orderBy: Prisma.FlooringProductOrderByWithRelationInput[] = []
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, productFieldOrderBy(entry.field, entry.direction))
  }

  // `id` is always appended last as the unique final tiebreak; its direction
  // mirrors the highest-priority entry so the trailing order matches the lead.
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
