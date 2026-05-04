import type { ManufacturerOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANUFACTURER_OPTIONS_QUERY_KEY = ["manufacturers", "options"] as const

export type ManufacturerOptionsResponse = {
  options: ManufacturerOption[]
}

export async function searchManufacturerOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  take = 20,
): Promise<ManufacturerOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(take))
  const url = `/api/manufacturers/options?${params.toString()}`
  const result = await requestJson<ManufacturerOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
