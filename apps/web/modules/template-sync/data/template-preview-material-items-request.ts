"use client"

import type { TemplatePreviewMaterialItemPage } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_SYNC_PREVIEW_MATERIAL_ITEMS_QUERY_KEY = [
  "template-sync",
  "preview",
  "material-items",
] as const

export type TemplatePreviewMaterialItemsResponse = {
  page: TemplatePreviewMaterialItemPage
}

export async function templatePreviewMaterialItemsRequest(
  templateId: string,
  page: number,
  pageSize: number,
  signal: AbortSignal | undefined,
): Promise<TemplatePreviewMaterialItemPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  const result = await requestJson<TemplatePreviewMaterialItemsResponse>(
    `/api/templates/${templateId}/preview/material-items?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}
