export type WarehouseDependentCounts = {
  inventoriesCount: number
  importsCount: number
  inventoryAdjustmentsCount: number
  workOrdersCount: number
  templatesCount: number
}

/**
 * Read-only totals shown in the warehouse record-view "Statistics" section.
 * Each value is a count of rows linked to the warehouse for that model.
 */
export type WarehouseStats = {
  templatesCount: number
  workOrdersCount: number
  importsCount: number
}

// Ordered so the blocked message lists dependents in a sensible reading order.
const WAREHOUSE_DEPENDENT_LABELS: ReadonlyArray<[keyof WarehouseDependentCounts, string]> = [
  ["inventoriesCount", "inventory"],
  ["importsCount", "imports"],
  ["inventoryAdjustmentsCount", "adjustments"],
  ["workOrdersCount", "work orders"],
  ["templatesCount", "templates"],
]

export function normalizeWarehouseName(name: string): string {
  return name.trim()
}

export function isWarehouseNameConflict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function isWarehouseDeleteBlocked(counts: WarehouseDependentCounts): boolean {
  return WAREHOUSE_DEPENDENT_LABELS.some(([key]) => counts[key] > 0)
}

export function buildWarehouseDeleteBlockedMessage(counts: WarehouseDependentCounts): string {
  const linked = WAREHOUSE_DEPENDENT_LABELS.filter(([key]) => counts[key] > 0).map(
    ([, label]) => label,
  )
  if (linked.length === 0) {
    return "Warehouse has no linked dependents"
  }
  return `Warehouse cannot be deleted while it has linked: ${linked.join(", ")}`
}
