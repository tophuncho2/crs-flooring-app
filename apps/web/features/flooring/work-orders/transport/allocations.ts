import type {
  InventoryAllocationOptionRecord,
  WorkOrderAllocationRunRecord,
  WorkOrderItemAllocationRecord,
} from "@builders/db"

export type WorkOrderItemAllocationListResponse = {
  allocations: WorkOrderItemAllocationRecord[]
}

export type InventoryAllocationOptionsResponse = {
  options: InventoryAllocationOptionRecord[]
}

export type WorkOrderAutoAllocationStatusResponse = {
  run: WorkOrderAllocationRunRecord | null
  isPending: boolean
}

export function buildWorkOrderItemAllocationListResponse(
  allocations: WorkOrderItemAllocationRecord[],
): WorkOrderItemAllocationListResponse {
  return { allocations }
}

export function buildInventoryAllocationOptionsResponse(
  options: InventoryAllocationOptionRecord[],
): InventoryAllocationOptionsResponse {
  return { options }
}

export function buildWorkOrderAutoAllocationStatusResponse(
  run: WorkOrderAllocationRunRecord | null,
): WorkOrderAutoAllocationStatusResponse {
  return {
    run,
    isPending:
      run?.status === "REQUESTED" ||
      run?.status === "QUEUED" ||
      run?.status === "PROCESSING",
  }
}
