/**
 * Stamps a generated id onto every entry in a cut-log diff's added array.
 * Mirrors `assignStagedInventoryDiffIds` — the application layer injects
 * `crypto.randomUUID` so this stays pure + testable.
 */
export function assignCutLogDiffIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}

export function buildCutLogTempIdMap(
  entries: Array<{ tempId: string; id: string }>,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of entries) {
    map[entry.tempId] = entry.id
  }
  return map
}
