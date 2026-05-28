export type ImportLinkState = {
  stagedInventoryRowCount: number
  liveInventoryRowCount: number
}

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
