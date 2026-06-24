import type { ManagementCompanyOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY = ["management-companies", "options"] as const

export type ManagementCompanyOptionsPage = {
  items: ManagementCompanyOption[]
  hasMore: boolean
}

export type ManagementCompanyOptionsRequestArgs = {
  skip?: number
  take?: number
}

export async function searchManagementCompanyOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ManagementCompanyOptionsRequestArgs = {},
): Promise<ManagementCompanyOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/management-companies/options?${params.toString()}`
  return requestJson<ManagementCompanyOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
