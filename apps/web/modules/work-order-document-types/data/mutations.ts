"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { WorkOrderDocumentType, WorkOrderDocumentTypeForm } from "@builders/domain"

export async function createWorkOrderDocumentTypeRequest(input: WorkOrderDocumentTypeForm) {
  return requestJson<{ workOrderDocumentType: WorkOrderDocumentType }>(
    "/api/work-order-document-types",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input)),
    },
  )
}

export async function updateWorkOrderDocumentTypeRequest(
  id: string,
  input: WorkOrderDocumentTypeForm,
  revisionKey: string,
) {
  return requestJson<{ workOrderDocumentType: WorkOrderDocumentType }>(
    `/api/work-order-document-types/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteWorkOrderDocumentTypeRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/work-order-document-types/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
