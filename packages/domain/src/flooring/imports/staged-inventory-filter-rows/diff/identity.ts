/**
 * Stamps a generated id onto every entry in a filter-row diff's added
 * array. Mirrors `assignStagedInventoryDiffIds` (which was deleted
 * with staged-inventory-rows' diff rewrite). Application layer injects
 * `crypto.randomUUID` so this stays pure + testable.
 */
export function assignStagedInventoryFilterDiffIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}

export function buildStagedInventoryFilterTempIdMap(
  entries: Array<{ tempId: string; id: string }>,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of entries) {
    map[entry.tempId] = entry.id
  }
  return map
}
