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
 * Resolve the manufacturer display name for a product.
 *
 * Rule: products show the manufacturer's company name. If the company name is
 * empty (rare — usually means a seeded manufacturer with only an agent on file),
 * fall back to the value stored on the product row itself (a historical snapshot
 * of the company name at create time). Agent name is NEVER a fallback.
 */
export function resolveProductManufacturerName(input: {
  companyName: string | null | undefined
  storedManufacturerName: string | null | undefined
}): string | null {
  const company = input.companyName?.trim()
  if (company) return company
  const stored = input.storedManufacturerName?.trim()
  if (stored) return stored
  return null
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
  coveragePerUnit: string
}): string {
  if (!input.categoryId.trim()) {
    return "Category is required"
  }
  if (input.coveragePerUnit.trim() && !/^\d+(\.\d{0,4})?$/.test(input.coveragePerUnit.trim())) {
    return "Coverage per unit must be numeric with up to 4 decimals"
  }
  return ""
}
