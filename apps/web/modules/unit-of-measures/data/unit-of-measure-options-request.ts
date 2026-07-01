import type { UnitOfMeasureOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const UNIT_OF_MEASURE_OPTIONS_QUERY_KEY = [
  "unit-of-measures",
  "options",
] as const

export type UnitOfMeasureOptionsPage = {
  items: UnitOfMeasureOption[]
  hasMore: boolean
}

/**
 * Infinite-scroll picker search. Signature matches the dropdown controller's
 * `pagedSearchFn(query, signal, skip)`, so it can be wired directly.
 */
export async function searchUnitOfMeasureOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  skip = 0,
  take = 20,
): Promise<UnitOfMeasureOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const url = `/api/unit-of-measures/options?${params.toString()}`
  return requestJson<UnitOfMeasureOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
