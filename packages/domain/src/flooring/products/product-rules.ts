// Pure business rules for the product domain. Consumed by the use-case layer
// (packages/application) — no I/O, no framework imports.

/**
 * Count shape returned by `getProductDeleteState` in @builders/db. Kept here
 * so domain rules express their contract without reaching into data-layer types.
 */
export type ProductDeleteCounts = {
  inventories: number
  templateItems: number
  workOrderItems: number
}

/**
 * Product cannot be deleted if ANY of its child references still exist.
 * Deletion never cascades — all of these must be removed or reassigned first.
 */
export function isProductDeleteBlocked(counts: ProductDeleteCounts): boolean {
  return counts.inventories > 0 || counts.templateItems > 0 || counts.workOrderItems > 0
}

export function buildProductDeleteBlockedMessage(counts: ProductDeleteCounts): string {
  const blockers: string[] = []
  if (counts.inventories > 0) {
    blockers.push(`${counts.inventories} inventory item${counts.inventories === 1 ? "" : "s"}`)
  }
  if (counts.workOrderItems > 0) {
    blockers.push(`${counts.workOrderItems} work order item${counts.workOrderItems === 1 ? "" : "s"}`)
  }
  if (counts.templateItems > 0) {
    blockers.push(`${counts.templateItems} template item${counts.templateItems === 1 ? "" : "s"}`)
  }

  if (blockers.length === 0) {
    return "Product has no linked references"
  }

  return `Product cannot be deleted while it has ${blockers.join(", ")} linked to it. Remove those links before deleting the product.`
}

/**
 * True if two product names would collide under the case-insensitive uniqueness rule.
 */
export function isProductNameConflict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Category is immutable post-create — full stop, regardless of whether any
 * inventory exists yet. The product's category drives the unit-of-measure
 * snapshot stamped on the product row (sendUnit/stockUnit Name + Abbrev),
 * and downstream snapshots on inventory rows
 * (`inventory.categorySlug`) and material item rows (`*.sendUnitName` etc).
 * Allowing the category to change post-create would drift every snapshot.
 *
 * Returns true when the caller is attempting to change the category, false
 * otherwise. Both ids are compared trimmed so whitespace noise doesn't
 * trigger a false positive.
 *
 * Defense in depth: `ProductUpdateForm` no longer carries `categoryId` and
 * the API PATCH validator rejects the field. This rule fires only when
 * something bypasses the type system (e.g., a future test using the data
 * client directly, or a malformed call from another use case).
 */
export function isProductCategoryChangeBlocked(
  currentCategoryId: string,
  nextCategoryId: string,
): boolean {
  return currentCategoryId.trim() !== nextCategoryId.trim()
}

export function buildProductCategoryChangeBlockedMessage(): string {
  return `Category cannot change after a product is created.`
}

/**
 * Client-side pre-submit validation of the primary section form.
 * Returns an empty string when valid, or a user-readable error message.
 *
 * Kept in the domain layer so the same rule can be reused by non-UI callers
 * (admin scripts, imports) without reaching into web-only code.
 */
export function validateProductPrimaryForm(input: { categoryId: string }): string {
  if (!input.categoryId.trim()) {
    return "Category is required"
  }
  return ""
}
