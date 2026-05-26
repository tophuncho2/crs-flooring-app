/**
 * Canonical "N items" label for a template's material-item count. Single
 * source so every template surface (sync cascade picker, hub list, work-order
 * pickers) renders the count identically.
 */
export function formatTemplateItemsCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`
}
