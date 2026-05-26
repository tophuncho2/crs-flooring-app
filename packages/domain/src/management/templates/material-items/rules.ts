import type { TemplateMaterialItemForm } from "./types.js"

// Quantity is optional — a blank value means "unset" (persisted as NULL).
// When a value IS provided it must be a finite number greater than zero.
export function validateTemplateMaterialItemForm(input: TemplateMaterialItemForm) {
  if (!input.productId) return "Product is required"
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}

// A product may be linked at most once per template (enforced canonically by
// the DB unique constraint). Surfaced when a save would create or leave a
// second row for the same product.
export function buildTemplateMaterialItemDuplicateProductMessage(): string {
  return `This product is already on the template. Each product can only be added once.`
}
