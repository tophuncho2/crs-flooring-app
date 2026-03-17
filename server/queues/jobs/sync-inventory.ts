export type SyncInventoryJob = {
  workOrderId?: string
  importEntryId?: string
  triggeredByUserId: string
}

export const SYNC_INVENTORY_JOB = "sync-inventory"
