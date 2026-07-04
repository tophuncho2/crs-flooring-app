import type { ImportLinkState } from "./delete-rules.js"

export function isImportWarehouseChangeBlocked(state: ImportLinkState): boolean {
  return state.stagedInventoryRowCount > 0 || state.liveInventoryRowCount > 0
}

export function buildImportWarehouseChangeBlockedMessage(state: ImportLinkState): string {
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
    return "Warehouse can be changed."
  }
  return `Cannot change warehouse while ${parts.join(" and ")} are linked to this import. Remove those rows before editing the warehouse.`
}
