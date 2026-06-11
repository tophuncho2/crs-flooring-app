"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
} from "@builders/application"
import type {
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"

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

// Adjustment mutations live at `@/modules/adjustments/data/mutations` (the
// shared peer module consumed by both work-orders and inventory record
// views). They were extracted in the adjustments FE sweep; this file no
// longer carries them.
