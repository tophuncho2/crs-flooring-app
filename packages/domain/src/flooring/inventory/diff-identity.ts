/**
 * Stamps a generated id onto every entry in a diff's added array.
 *
 * Used by the application layer to pre-assign UUIDs to added inventory rows
 * before calling the data-layer diff primitive. Keeps UUID generation out of
 * use-case bodies and the data layer pure about IDs.
 *
 * The generateId callback is injected (typically crypto.randomUUID from the
 * application layer) to keep this function pure and testable.
 */
export function assignInventoryDiffIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}

/**
 * Builds a tempId → real-id lookup from the output of assignInventoryDiffIds.
 * Data-layer primitives use this to resolve cross-row references (none needed
 * in sweep 2 since inventory rows are flat, but the shape mirrors the
 * warehouses diff so Sweep 3's cut-log diff can adopt it unchanged).
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
