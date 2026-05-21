import type { ImportOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const IMPORTS_OPTIONS_QUERY_KEY = ["imports", "options"] as const

export type ImportsOptionsResponse = {
  options: ImportOption[]
}

export async function searchImportOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  take = 20,
): Promise<ImportOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(take))
  const url = `/api/imports/options?${params.toString()}`
  const result = await requestJson<ImportsOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
