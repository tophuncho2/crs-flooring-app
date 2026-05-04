"use client"

import type { WorkOrderDetail, WorkOrderMaterialItemRow } from "@builders/domain"
import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"

export type SyncTemplateResponse = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
}

export async function syncTemplateRequest(args: {
  templateId: string
}): Promise<SyncTemplateResponse> {
  return requestJson<SyncTemplateResponse>("/api/work-orders/from-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ templateId: args.templateId })),
  })
}
