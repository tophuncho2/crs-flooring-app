/**
 * Link-state shape the caller (application layer) hands in when asking the
 * domain whether a delete is allowed. Counts are resolved via the data layer.
 */
export type ImportLinkState = {
  stagedInventoryRowCount: number
  liveInventoryRowCount: number
}

/**
 * Deletion is blocked whenever an import has any downstream rows — staged
 * drafts OR live inventory. The FK on live inventory is `Restrict` at the
 * schema level, so this predicate mirrors that DB-side invariant and also
 * covers staged rows (whose schema FK is `Cascade`, but the domain predicate
 * supersedes the cascade — delete is rejected before it reaches the DB).
 */
export function isImportDeleteBlocked(state: ImportLinkState): boolean {
  return state.stagedInventoryRowCount > 0 || state.liveInventoryRowCount > 0
}

export function buildImportDeleteBlockedMessage(state: ImportLinkState): string {
  const parts: string[] = []
  if (state.stagedInventoryRowCount > 0) {
    parts.push(
      `${state.stagedInventoryRowCount} staged inventory row${state.stagedInventoryRowCount === 1 ? "" : "s"}`,
    )
  }
  if (state.liveInventoryRowCount > 0) {
    parts.push(
      `${state.liveInventoryRowCount} live inventory row${state.liveInventoryRowCount === 1 ? "" : "s"}`,
    )
  }
  if (parts.length === 0) {
    return "This import has no linked rows."
  }
  return `This import has ${parts.join(" and ")} linked to it and cannot be deleted. Remove those rows first.`
}
