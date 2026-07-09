"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  TemplateDetail,
  TemplateForm,
  TemplateInvoiceItemsDiff,
  TemplatePlannedPaymentsDiff,
  TemplatePlannedProductsDiff,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"

export async function createTemplateRequest(input: TemplateForm) {
  return requestJson<{ template: TemplateDetail }>("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateTemplateRequest(id: string, input: TemplateForm, revisionKey: string) {
  return requestJson<{ template: TemplateDetail }>(
    `/api/templates/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteTemplateRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/templates/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

export type SyncTemplateToWorkOrderResponse = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
}

export async function syncTemplateToWorkOrderRequest(templateId: string) {
  return requestJson<SyncTemplateToWorkOrderResponse>(
    `/api/templates/${templateId}/sync-to-work-order`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({})),
    },
  )
}

export async function saveTemplatePlannedProductsSectionRequest(
  templateId: string,
  diff: TemplatePlannedProductsDiff,
  revisionKey: string,
) {
  return requestJson<{ template: TemplateDetail; tempIdMap: Record<string, string> }>(
    `/api/templates/${templateId}/planned-products/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}

export async function saveTemplatePlannedPaymentsSectionRequest(
  templateId: string,
  diff: TemplatePlannedPaymentsDiff,
  revisionKey: string,
) {
  return requestJson<{ template: TemplateDetail; tempIdMap: Record<string, string> }>(
    `/api/templates/${templateId}/planned-payments/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}

export async function saveTemplateInvoiceItemsSectionRequest(
  templateId: string,
  diff: TemplateInvoiceItemsDiff,
  revisionKey: string,
) {
  return requestJson<{ template: TemplateDetail; tempIdMap: Record<string, string> }>(
    `/api/templates/${templateId}/invoice-items/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}
