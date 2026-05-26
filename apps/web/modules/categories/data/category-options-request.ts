import type { CategoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CATEGORY_OPTIONS_QUERY_KEY = ["categories", "options"] as const

export type CategoryOptionsPage = {
  items: CategoryOption[]
  hasMore: boolean
}

/**
 * Infinite-scroll picker search. Signature matches the dropdown controller's
 * `pagedSearchFn(query, signal, skip)`, so it can be wired directly.
 */
export async function searchCategoryOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  skip = 0,
  take = 20,
): Promise<CategoryOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const url = `/api/categories/options?${params.toString()}`
  return requestJson<CategoryOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
