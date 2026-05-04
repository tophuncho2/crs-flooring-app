import type { SectionOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const SECTION_OPTIONS_QUERY_KEY = ["warehouse-sections", "options"] as const

export type SectionOptionsResponse = {
  options: SectionOption[]
}

export type SectionOptionsRequestArgs = {
  warehouseId: string
  take?: number
}

export async function searchSectionOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: SectionOptionsRequestArgs,
): Promise<SectionOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/warehouse-sections/options?${params.toString()}`
  const result = await requestJson<SectionOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
