import type { ManufacturerOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANUFACTURER_OPTIONS_QUERY_KEY = ["manufacturers", "options"] as const

export type ManufacturerOptionsPage = {
  items: ManufacturerOption[]
  hasMore: boolean
}

export type ManufacturerOptionsRequestArgs = {
  skip?: number
  take?: number
}

export async function searchManufacturerOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ManufacturerOptionsRequestArgs = {},
): Promise<ManufacturerOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/manufacturers/options?${params.toString()}`
  return requestJson<ManufacturerOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
