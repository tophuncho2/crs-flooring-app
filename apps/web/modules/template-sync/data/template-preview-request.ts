"use client"

import type { TemplatePreview } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_SYNC_PREVIEW_QUERY_KEY = ["template-sync", "preview"] as const

export type TemplatePreviewResponse = {
  preview: TemplatePreview
}

export async function templatePreviewRequest(
  templateId: string,
  signal: AbortSignal | undefined,
): Promise<TemplatePreview> {
  const result = await requestJson<TemplatePreviewResponse>(
    `/api/templates/${templateId}/preview`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.preview
}
