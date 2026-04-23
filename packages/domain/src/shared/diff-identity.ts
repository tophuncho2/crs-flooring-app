/**
 * Stamps a generated id onto every entry in a diff's added array.
 *
 * Used by application-layer use cases to pre-assign UUIDs to draft entries
 * (entries carrying a `tempId` from the UI) before handing them to the data
 * layer's `apply*Diff` primitive. Keeps UUID generation out of data-layer
 * code and keeps use-case bodies focused on orchestration.
 *
 * The `generateId` callback is injected (typically `crypto.randomUUID`) so
 * this function stays pure and testable.
 *
 * Shared across modules. First consumer: template material items.
 */
export function assignDraftIds<T extends { tempId: string }>(
  entries: T[],
  generateId: () => string,
): Array<T & { id: string }> {
  return entries.map((entry) => ({ ...entry, id: generateId() }))
}
