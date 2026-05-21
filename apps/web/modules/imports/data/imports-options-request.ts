import type { ImportOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const IMPORTS_OPTIONS_QUERY_KEY = ["imports", "options"] as const

export type ImportsOptionsRequestArgs = {
  /** Required scope — server validates non-empty. */
  warehouseId: string
  take?: number
}

export type ImportsOptionsResponse = {
  options: ImportOption[]
}

export async function searchImportOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ImportsOptionsRequestArgs,
): Promise<ImportOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/imports/options?${params.toString()}`
  const result = await requestJson<ImportsOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
