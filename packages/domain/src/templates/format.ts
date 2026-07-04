/**
 * Canonical "N planned products" label for a template's planned-product count. Single
 * source so every template surface (sync cascade picker, hub list, work-order
 * pickers) renders the count identically.
 */
export function formatTemplatePlannedProductsCount(count: number): string {
  return `${count} ${count === 1 ? "planned product" : "planned products"}`
}
