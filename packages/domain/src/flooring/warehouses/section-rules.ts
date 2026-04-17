export type SectionDependentCounts = {
  locationsCount: number
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
