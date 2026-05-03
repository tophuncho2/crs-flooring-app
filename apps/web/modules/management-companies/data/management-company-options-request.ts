import type { ManagementCompanyOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY = ["management-companies", "options"] as const

export type ManagementCompanyOptionsResponse = {
  options: ManagementCompanyOption[]
}

export async function searchManagementCompanyOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  take = 20,
): Promise<ManagementCompanyOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(take))
  const url = `/api/management-companies/options?${params.toString()}`
  const result = await requestJson<ManagementCompanyOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
