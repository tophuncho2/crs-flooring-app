export type SectionDependentCounts = {
  locationsCount: number
}

export function normalizeSectionName(name: string): string {
  return name.trim()
}

export function isSectionNameConflict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function isSectionSlugConflict(a: string, b: string): boolean {
  return a.trim() === b.trim()
}

export function isSectionDeleteBlocked(counts: SectionDependentCounts): boolean {
  return counts.locationsCount > 0
}

export function buildSectionDeleteBlockedMessage(counts: SectionDependentCounts): string {
  if (counts.locationsCount > 0) {
    return "Section cannot be deleted while locations are linked to it"
  }
  return "Section has no linked dependents"
}

export function doesSectionBelongToWarehouse(
  section: { warehouseId: string },
  warehouseId: string,
): boolean {
  return section.warehouseId === warehouseId
}
