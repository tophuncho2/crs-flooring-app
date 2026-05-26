/**
 * Finds the first productId that appears more than once in a list.
 *
 * Pure + shared across material-item collections — work-order items and
 * template items alike. A product may be linked at most once per parent
 * (one WO / one template). The DB `@@unique` constraints are the canonical
 * enforcement; this helper powers the friendly pre-flight check in the
 * section-save use cases so a duplicate surfaces as a clear domain error
 * instead of a raw Prisma P2002. Not a Products-domain rule — the product
 * entity has no knowledge of its parents; this is a collection invariant.
 *
 * Returns the duplicated productId, or null when every id is distinct.
 */
export function findDuplicateProductId(productIds: string[]): string | null {
  const seen = new Set<string>()
  for (const productId of productIds) {
    if (seen.has(productId)) return productId
    seen.add(productId)
  }
  return null
}
