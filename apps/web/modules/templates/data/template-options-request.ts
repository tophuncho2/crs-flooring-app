import type { TemplateOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_OPTIONS_QUERY_KEY = ["templates", "options"] as const

export type TemplateOptionsResponse = {
  options: TemplateOption[]
}

export type TemplateOptionsRequestArgs = {
  propertyId: string
  take?: number
}

export async function searchTemplateOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: TemplateOptionsRequestArgs,
): Promise<TemplateOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("propertyId", args.propertyId)
  params.set("take", String(args.take ?? 20))
  const url = `/api/templates/options?${params.toString()}`
  const result = await requestJson<TemplateOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
