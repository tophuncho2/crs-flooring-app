import type { FlooringCutLogStatus } from "../../inventory/cut-logs/types.js"

/**
 * UI projection of a cut log row as displayed inside the WOMI section's
 * cut-log grid. Narrower than `CutLogRow` from the inventory cut-log
 * domain — drops fields the section doesn't render
 * (`cost` / `freight` / `createdAt` / `void` / `workOrderId` /
 * `workOrderItemId`) and pins `coverageCut` as a string (the SSR loader
 * normalizes nulls to "").
 */
export type WorkOrderItemPendingCutLogRow = {
  id: string
  cutLogNumber: string
  status: FlooringCutLogStatus
  isFinal: boolean
  inventoryId: string
  before: string
  cut: string
  after: string
  coverageCut: string
  isWaste: boolean
  notes: string
  finalCutSequence: number | null
  updatedAt: string
}
