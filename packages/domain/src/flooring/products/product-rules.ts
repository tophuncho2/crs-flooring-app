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
 * Client-side pre-submit validation of the primary section form.
 * Returns an empty string when valid, or a user-readable error message.
 *
 * Kept in the domain layer so the same rule can be reused by non-UI callers
 * (admin scripts, imports) without reaching into web-only code.
 */
export function validateProductPrimaryForm(input: {
  categoryId: string
  unitId: string
}): string {
  if (!input.categoryId.trim()) {
    return "Category is required"
  }
  if (!input.unitId.trim()) {
    return "Unit is required"
  }
  return ""
}
