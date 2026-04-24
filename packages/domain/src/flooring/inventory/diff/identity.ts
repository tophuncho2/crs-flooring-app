/**
 * Stamps a generated id onto every entry in a diff's added array. Kept in the
 * domain layer so UUID generation stays pure + testable — the application
 * layer injects `crypto.randomUUID` at call time.
 */
export function assignInventoryDiffIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}

/**
 * Builds a tempId → real-id lookup from the output of assignInventoryDiffIds.
 * Data-layer primitives use this to resolve cross-row references.
 */
export function buildInventoryTempIdMap(
  entries: Array<{ tempId: string; id: string }>,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of entries) {
    map[entry.tempId] = entry.id
  }
  return map
}
