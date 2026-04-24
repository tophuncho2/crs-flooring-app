export type InventoryDependentCounts = {
  cutLogsCount: number
}

export function isInventoryDeleteBlocked(counts: InventoryDependentCounts): boolean {
  return counts.cutLogsCount > 0
}

export function buildInventoryDeleteBlockedMessage(counts: InventoryDependentCounts): string {
  if (counts.cutLogsCount <= 0) return "Inventory row has no linked cut logs"
  return `Inventory cannot be deleted while ${counts.cutLogsCount} cut log${counts.cutLogsCount === 1 ? "" : "s"} reference${counts.cutLogsCount === 1 ? "s" : ""} it`
}
