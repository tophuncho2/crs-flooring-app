import type { CategoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CATEGORY_OPTIONS_QUERY_KEY = ["categories", "options"] as const

export type CategoryOptionsResponse = {
  options: CategoryOption[]
}

export async function searchCategoryOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  take = 20,
): Promise<CategoryOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(take))
  const url = `/api/categories/options?${params.toString()}`
  const result = await requestJson<CategoryOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
