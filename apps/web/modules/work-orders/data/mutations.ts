"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
} from "@builders/application"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"
import type { WorkOrderFileRow } from "@builders/db"

export async function createWorkOrderRequest(input: CreateWorkOrderUseCaseInput) {
  return requestJson<{ workOrder: WorkOrderDetail }>("/api/work-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateWorkOrderRequest(
  id: string,
  input: UpdateWorkOrderUseCaseInput,
  revisionKey: string,
) {
  return requestJson<{ workOrder: WorkOrderDetail }>(
    `/api/work-orders/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input as Record<string, unknown>, revisionKey)),
    },
  )
}

export async function deleteWorkOrderRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/work-orders/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

export async function saveWorkOrderMaterialItemsSectionRequest(
  workOrderId: string,
  diff: WorkOrderMaterialItemsDiff,
  revisionKey: string,
) {
  return requestJson<{
    workOrder: WorkOrderDetail
    materialItems: WorkOrderMaterialItemRow[]
    tempIdMap: Record<string, string>
  }>(
    `/api/work-orders/${workOrderId}/material-items/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}

// ---------------------------------------------------------------------------
// Per-row pending-cut-log mutations (sync; one row per request)
// ---------------------------------------------------------------------------
//
// These replace the diff-driven `saveWorkOrderItemPendingCutLogDiffRequest`
// from the prior worker-driven flow. Each helper hits one of the new sync
// API routes:
//   POST   /api/work-orders/[id]/cut-logs                — create
//   PATCH  /api/work-orders/[id]/cut-logs/[cutLogId]     — update (OCC required)
//   DELETE /api/work-orders/[id]/cut-logs/[cutLogId]     — delete (OCC required)
//
// Routes return 200 OK with the post-mutation row + parent inventory's
// recomputed totalCutSum. The section controller patches local state
// from these responses without a refetch.

export type PendingCutLogMutationResponse = {
  cutLog: CutLogRow
  inventoryId: string
  totalCutSum: string
}

export type DeletePendingCutLogResponse = {
  deletedId: string
  inventoryId: string
  totalCutSum: string
}

export async function createPendingCutLogRequest(args: {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}) {
  const body = withMutationMeta({
    workOrderItemId: args.workOrderItemId,
    inventoryId: args.inventoryId,
    cut: args.cut,
    isWaste: args.isWaste,
    notes: args.notes,
  } as Record<string, unknown>)
  return requestJson<PendingCutLogMutationResponse>(
    `/api/work-orders/${args.workOrderId}/cut-logs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function updatePendingCutLogRequest(args: {
  workOrderId: string
  cutLogId: string
  workOrderItemId: string
  expectedUpdatedAt: string
  patch: { cut?: string; isWaste?: boolean; notes?: string }
}) {
  const body = withMutationMeta(
    {
      workOrderItemId: args.workOrderItemId,
      patch: args.patch,
    } as Record<string, unknown>,
    args.expectedUpdatedAt,
  )
  return requestJson<PendingCutLogMutationResponse>(
    `/api/work-orders/${args.workOrderId}/cut-logs/${args.cutLogId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function deletePendingCutLogRequest(args: {
  workOrderId: string
  cutLogId: string
  workOrderItemId: string
  expectedUpdatedAt: string
}) {
  const body = withMutationMeta(
    {
      workOrderItemId: args.workOrderItemId,
    } as Record<string, unknown>,
    args.expectedUpdatedAt,
  )
  return requestJson<DeletePendingCutLogResponse>(
    `/api/work-orders/${args.workOrderId}/cut-logs/${args.cutLogId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export type FinalizeCutLogBatchResponse = {
  batch: {
    outboxEventId: string
    wasDuplicate: boolean
    touchedWorkOrderItemIds: string[]
  }
}

export async function finalizeWorkOrderCutLogBatchRequest(args: {
  workOrderId: string
  requestKey: string
  cutLogIds: string[]
}) {
  const body = withMutationMeta({
    requestKey: args.requestKey,
    cutLogIds: args.cutLogIds,
  } as Record<string, unknown>)
  return requestJson<FinalizeCutLogBatchResponse>(
    `/api/work-orders/${args.workOrderId}/cut-logs/finalize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

export async function voidWorkOrderCutLogRequest(args: {
  workOrderId: string
  cutLogId: string
}) {
  return requestJson<{ cutLog: { id: string; inventoryId: string } }>(
    `/api/work-orders/${args.workOrderId}/cut-logs/${args.cutLogId}/void`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}

export async function requestWorkOrderFileRequest(workOrderId: string) {
  return requestJson<{
    file: { fileId: string; fileNumber: number; outboxEventId: string; wasDuplicate: boolean }
  }>(`/api/work-orders/${workOrderId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({})),
  })
}

export async function deleteWorkOrderFileRequest(workOrderId: string, fileId: string) {
  return requestJson<{ ok: true }>(`/api/work-orders/${workOrderId}/files/${fileId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({})),
  })
}

export async function getWorkOrderFileDownloadUrlRequest(args: {
  workOrderId: string
  fileId: string
}) {
  return requestJson<{ url: string }>(
    `/api/work-orders/${args.workOrderId}/files/${args.fileId}/download`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  )
}

export async function listEligibleInventoryRequest(args: {
  workOrderId: string
  workOrderItemId: string
}) {
  return requestJson<{
    inventories: Array<{
      id: string
      inventoryNumber: string
      itemNumber: string
      dyeLot: string
      startingStock: string
      totalCutSum: string
      remainingStock: string
      stockUnitAbbrev: string
      locationCode: string
      sectionCode: string
    }>
  }>(
    `/api/work-orders/${args.workOrderId}/material-items/${args.workOrderItemId}/eligible-inventory`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  )
}

export async function listWorkOrderFilesRequest(workOrderId: string) {
  return requestJson<{ files: WorkOrderFileRow[] }>(`/api/work-orders/${workOrderId}/files`, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
