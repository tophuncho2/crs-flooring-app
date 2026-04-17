export type WarehouseDependentCounts = {
  sectionsCount: number
  locationsCount: number
  workOrdersCount: number
}

export function normalizeWarehouseName(name: string): string {
  return name.trim()
}

export function isWarehouseNameConflict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function isWarehouseDeleteBlocked(counts: WarehouseDependentCounts): boolean {
  return counts.sectionsCount > 0 || counts.locationsCount > 0 || counts.workOrdersCount > 0
}

export function buildWarehouseDeleteBlockedMessage(counts: WarehouseDependentCounts): string {
  const blockers: string[] = []
  if (counts.workOrdersCount > 0) blockers.push("work orders")
  if (counts.locationsCount > 0) blockers.push("locations")
  if (counts.sectionsCount > 0) blockers.push("sections")

  if (blockers.length === 0) {
    return "Warehouse has no linked dependents"
  }

  return `Warehouse cannot be deleted while ${blockers.join(", ")} are linked to it`
}
