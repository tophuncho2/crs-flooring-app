/**
 * Stamps a generated id onto every entry in a diff's added array.
 *
 * Used by application layer to pre-assign UUIDs to added sections and
 * locations before calling the data-layer diff primitive. Keeps UUID
 * generation out of use-case bodies and the data layer pure about IDs.
 *
 * The generateId callback is injected (typically crypto.randomUUID from
 * the application layer) to keep this function pure and testable.
 */
export function assignDiffIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}
