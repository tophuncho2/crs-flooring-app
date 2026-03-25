export type SyncInventoryJob = {
  workOrderId?: string
  importEntryId?: string
  triggeredByUserId: string
  reason?: "work-order-update" | "import-update" | "manual"
}

export const SYNC_INVENTORY_JOB = "sync-inventory"
