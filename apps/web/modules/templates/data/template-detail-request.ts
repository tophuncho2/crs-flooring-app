"use client"

import type { TemplateDetail } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_DETAIL_QUERY_KEY = ["templates", "detail"] as const

/**
 * Client read of a full template record (primary fields + material items), used
 * by the template hub to load the editable record below the cascade pickers
 * when a template is selected. Hits the same `GET /api/templates/[id]` the
 * (now-removed) standalone detail page loaded on the server.
 */
export async function fetchTemplateDetailRequest(
  templateId: string,
  signal?: AbortSignal,
): Promise<TemplateDetail> {
  const { template } = await requestJson<{ template: TemplateDetail }>(
    `/api/templates/${templateId}`,
    { method: "GET", headers: { Accept: "application/json" }, signal },
  )
  return template
}
