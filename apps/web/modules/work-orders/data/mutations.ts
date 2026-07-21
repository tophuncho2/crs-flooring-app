"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
} from "@builders/application"
import type {
  WorkOrderDetail,
  WorkOrderEntityInvolvementRow,
  WorkOrderEntityInvolvementsDiff,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
  WorkOrderPlannedPaymentRow,
  WorkOrderPlannedPaymentsDiff,
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

export async function saveWorkOrderPlannedPaymentsSectionRequest(
  workOrderId: string,
  diff: WorkOrderPlannedPaymentsDiff,
  revisionKey: string,
) {
  return requestJson<{
    workOrder: WorkOrderDetail
    plannedPayments: WorkOrderPlannedPaymentRow[]
    tempIdMap: Record<string, string>
  }>(
    `/api/work-orders/${workOrderId}/planned-payments/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}

export async function saveWorkOrderEntityInvolvementsSectionRequest(
  workOrderId: string,
  diff: WorkOrderEntityInvolvementsDiff,
  revisionKey: string,
) {
  return requestJson<{
    workOrder: WorkOrderDetail
    entityInvolvements: WorkOrderEntityInvolvementRow[]
    tempIdMap: Record<string, string>
  }>(
    `/api/work-orders/${workOrderId}/entity-involvement/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}

// Record one print/export event for a work order, keyed by the doc type printed.
// Fired by the print configurator's Print button right before window.print().
// `withMutationMeta` with no revision key mints a FRESH idempotency key per call,
// so every Print click is counted (not deduped as a replay).
export async function recordWorkOrderPrintEventRequest(
  workOrderId: string,
  documentTypeId: string,
  documentTypeName: string,
) {
  return requestJson<{ ok: true }>(`/api/work-orders/${workOrderId}/print-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ documentTypeId, documentTypeName })),
  })
}

// Adjustment mutations live at `@/modules/adjustments/data/mutations` (the
// shared peer module consumed by both work-orders and inventory record
// views). They were extracted in the adjustments FE sweep; this file no
// longer carries them.
