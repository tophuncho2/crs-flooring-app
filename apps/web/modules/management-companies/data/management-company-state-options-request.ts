import type { ManagementCompanyStateOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANAGEMENT_COMPANY_STATES_SEARCH_QUERY_KEY = [
  "management-companies",
  "states",
  "options",
  "search",
] as const

export type ManagementCompanyStatesResponse = {
  options: ManagementCompanyStateOption[]
}

export async function searchManagementCompanyStatesRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: { take?: number } = {},
): Promise<ManagementCompanyStateOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/management-companies/states/search?${params.toString()}`
  const result = await requestJson<ManagementCompanyStatesResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
