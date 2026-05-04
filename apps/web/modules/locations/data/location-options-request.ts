import type { LocationOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const LOCATION_OPTIONS_QUERY_KEY = ["locations", "options"] as const

export type LocationOptionsResponse = {
  options: LocationOption[]
}

export type LocationOptionsRequestArgs = {
  warehouseId: string
  take?: number
}

export async function searchLocationOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: LocationOptionsRequestArgs,
): Promise<LocationOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/locations/options?${params.toString()}`
  const result = await requestJson<LocationOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
