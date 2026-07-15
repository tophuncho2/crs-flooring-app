import type { ProductSearchInput } from "@builders/domain"
import type { Prisma } from "../generated/prisma/client.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { combineAnd } from "../shared/where.js"

/**
 * Shared product list-filter primitives — the ONE source for the product-based
 * Search and Sort tools that appear on the Products list AND on every list whose
 * rows link to a `FlooringProduct` (inventory, adjustments, inventory-indicators).
 *
 * The pure allowlists (`PRODUCT_SEARCH_KEYS` / `PRODUCT_SORT_FIELDS`) live in
 * `@builders/domain`; this file owns the Prisma clause builders. Products applies
 * the clauses to its own row (self path); the linked tables apply them through
 * their `product` relation. Because the indexes ride the real product row (trgm
 * GIN on style/color, `[style,id]`/`[color,id]` btree, `FlooringCategory.name
 * @unique`), both paths reuse the same indexes with no new migration.
 */

/**
 * Builds the inner `FlooringProduct` where-clauses for the four product searches:
 * `prodNumber` is an exact match on the generated `productNumberInt` (btree);
 * `color`/`style`/`namingAddon` are case-insensitive substring matches (trgm GIN).
 * Blank/whitespace terms are skipped. Returns the bare product clauses — callers
 * either push them onto a `FlooringProduct` where (Products) or wrap them through
 * the relation via {@link productSearchRelationClause} (linked tables).
 */
export function buildProductSearchClauses(
  search: ProductSearchInput | undefined,
): Prisma.FlooringProductWhereInput[] {
  const clauses: Prisma.FlooringProductWhereInput[] = []

  const prodNumber = search?.prodNumber?.trim() ?? ""
  if (prodNumber.length > 0) {
    clauses.push({ productNumberInt: exactNumberIntEquals(prodNumber) })
  }

  const color = search?.color?.trim() ?? ""
  if (color.length > 0) {
    clauses.push({ color: { contains: color, mode: "insensitive" } })
  }

  const style = search?.style?.trim() ?? ""
  if (style.length > 0) {
    clauses.push({ style: { contains: style, mode: "insensitive" } })
  }

  const namingAddon = search?.namingAddon?.trim() ?? ""
  if (namingAddon.length > 0) {
    clauses.push({ productNamingAddon: { contains: namingAddon, mode: "insensitive" } })
  }

  return clauses
}

/**
 * Wraps the product searches as a single `{ product: { is: … } }` relation filter
 * for a parent row (inventory/adjustment/indicator). Returns `undefined` when no
 * search term is active so the caller can skip the clause entirely.
 */
export function productSearchRelationClause(
  search: ProductSearchInput | undefined,
): { product: { is: Prisma.FlooringProductWhereInput } } | undefined {
  const inner = combineAnd(buildProductSearchClauses(search))
  return inner ? { product: { is: inner } } : undefined
}

/**
 * Maps a product-attribute Sort field to a Prisma `orderBy` on the product row
 * itself. `category` sorts on the related category name; `style`/`color` are
 * nullable free-text ordered with nulls last. Unknown fields → `undefined` so the
 * caller can fall through to its own local fields.
 */
export function productAttributeOrderBy(
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
    default:
      return undefined
  }
}

/**
 * Wraps {@link productAttributeOrderBy} through the `product` relation for a parent
 * row — `{ product: { category: { name } } }` etc. Returns `undefined` for
 * non-product fields so the caller can handle its own local sort columns.
 */
export function productRelationAttributeOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): { product: Prisma.FlooringProductOrderByWithRelationInput } | undefined {
  const inner = productAttributeOrderBy(field, direction)
  return inner ? { product: inner } : undefined
}
