"use client"

import type { TemplatePreviewHeader } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_SYNC_PREVIEW_HEADER_QUERY_KEY = [
  "template-sync",
  "preview",
  "header",
] as const

export type TemplatePreviewHeaderResponse = {
  header: TemplatePreviewHeader
}

export async function templatePreviewHeaderRequest(
  templateId: string,
  signal: AbortSignal | undefined,
): Promise<TemplatePreviewHeader> {
  const result = await requestJson<TemplatePreviewHeaderResponse>(
    `/api/templates/${templateId}/preview`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.header
}
