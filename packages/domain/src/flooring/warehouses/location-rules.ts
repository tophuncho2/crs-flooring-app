export type LocationDependentCounts = {
  inventoriesCount: number
}

export function normalizeLocationCode(code: string): string {
  return code.trim().toUpperCase()
}

export function isLocationCodeConflict(a: string, b: string): boolean {
  return normalizeLocationCode(a) === normalizeLocationCode(b)
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
