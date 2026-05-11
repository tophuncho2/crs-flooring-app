export type WarehouseDependentCounts = {
  workOrdersCount: number
}

export function normalizeWarehouseName(name: string): string {
  return name.trim()
}

export function isWarehouseNameConflict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function isWarehouseDeleteBlocked(counts: WarehouseDependentCounts): boolean {
  return counts.workOrdersCount > 0
}

export function buildWarehouseDeleteBlockedMessage(counts: WarehouseDependentCounts): string {
  if (counts.workOrdersCount > 0) {
    return "Warehouse cannot be deleted while work orders are linked to it"
  }
  return "Warehouse has no linked dependents"
}
