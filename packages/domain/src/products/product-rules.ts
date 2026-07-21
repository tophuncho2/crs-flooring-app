// Pure business rules for the product domain. Consumed by the use-case layer
// (packages/application) — no I/O, no framework imports.

import { isValidMoneyAmount } from "../shared/money.js"

/**
 * Count shape returned by `getProductDeleteState` in @builders/db. Kept here
 * so domain rules express their contract without reaching into data-layer types.
 */
export type ProductDeleteCounts = {
  inventories: number
  plannedProducts: number
  workOrderItems: number
}

/**
 * Product cannot be deleted if ANY of its child references still exist.
 * Deletion never cascades — all of these must be removed or reassigned first.
 */
export function isProductDeleteBlocked(counts: ProductDeleteCounts): boolean {
  return counts.inventories > 0 || counts.plannedProducts > 0 || counts.workOrderItems > 0
}

export function buildProductDeleteBlockedMessage(counts: ProductDeleteCounts): string {
  const blockers: string[] = []
  if (counts.inventories > 0) {
    blockers.push(`${counts.inventories} inventory item${counts.inventories === 1 ? "" : "s"}`)
  }
  if (counts.workOrderItems > 0) {
    blockers.push(`${counts.workOrderItems} work order item${counts.workOrderItems === 1 ? "" : "s"}`)
  }
  if (counts.plannedProducts > 0) {
    blockers.push(`${counts.plannedProducts} planned product${counts.plannedProducts === 1 ? "" : "s"}`)
  }

  if (blockers.length === 0) {
    return "Product has no linked references"
  }

  return `Product cannot be deleted while it has ${blockers.join(", ")} linked to it. Remove those links before deleting the product.`
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
  cost?: string
  unitPrice?: string
}): string {
  if (!input.categoryId.trim()) {
    return "Category is required"
  }
  if (!input.unitId.trim()) {
    return "Unit is required"
  }
  // Cost is optional (empty = unset). When present it must be a well-formed
  // money amount. No cross-field rule: a cost does not require a cost-unit.
  if (input.cost && input.cost.trim() && !isValidMoneyAmount(input.cost)) {
    return "Cost is not a valid amount"
  }
  // Unit price is optional (empty = unset); when present it must be valid money.
  if (input.unitPrice && input.unitPrice.trim() && !isValidMoneyAmount(input.unitPrice)) {
    return "Unit price is not a valid amount"
  }
  return ""
}
