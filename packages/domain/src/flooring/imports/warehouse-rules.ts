import type { ImportLinkState } from "./delete-rules.js"

/**
 * An import's warehouse can't be changed while any staged OR live inventory
 * rows reference it. Rows snapshot their warehouse from the import at create
 * time (enforced by the staged-rows domain `IMPORT_WAREHOUSE_MISMATCH` rule);
 * flipping the import's warehouse after that would create a mismatched parent
 * without a clean reconciliation path. Clear the rows first.
 */
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
