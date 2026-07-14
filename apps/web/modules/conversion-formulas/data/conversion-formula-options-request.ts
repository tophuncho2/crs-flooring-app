import type { ConversionFormulaOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CONVERSION_FORMULA_OPTIONS_QUERY_KEY = [
  "conversion-formulas",
  "options",
] as const

export type ConversionFormulaOptionsPage = {
  items: ConversionFormulaOption[]
  hasMore: boolean
}

/**
 * Infinite-scroll picker search. Signature matches the dropdown controller's
 * `pagedSearchFn(query, signal, skip)`, so it wires directly. Read-only lookup.
 */
export async function searchConversionFormulaOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  skip = 0,
  take = 20,
): Promise<ConversionFormulaOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const url = `/api/conversion-formulas/options?${params.toString()}`
  return requestJson<ConversionFormulaOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
