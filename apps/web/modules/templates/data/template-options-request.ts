import type { TemplateOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const TEMPLATE_OPTIONS_QUERY_KEY = ["templates", "options"] as const

export type TemplateOptionsPage = {
  items: TemplateOption[]
  hasMore: boolean
}

export type TemplateOptionsRequestArgs = {
  propertyId?: string
  managementCompanyId?: string
  skip?: number
  take?: number
}

export async function searchTemplateOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: TemplateOptionsRequestArgs = {},
): Promise<TemplateOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.propertyId) params.set("propertyId", args.propertyId)
  if (args.managementCompanyId) params.set("managementCompanyId", args.managementCompanyId)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/templates/options?${params.toString()}`
  return requestJson<TemplateOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
