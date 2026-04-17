export type LocationDependentCounts = {
  inventoriesCount: number
}

export function isLocationDeleteBlocked(counts: LocationDependentCounts): boolean {
  return counts.inventoriesCount > 0
}

export function buildLocationDeleteBlockedMessage(counts: LocationDependentCounts): string {
  if (counts.inventoriesCount > 0) {
    return "Location cannot be deleted while inventory rows are linked to it"
  }
  return "Location has no linked dependents"
}
