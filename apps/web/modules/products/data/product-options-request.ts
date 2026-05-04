import type { ProductPickerOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

// Bucket key includes the categoryId scope so React Query treats different
// category filters as independent caches. `null` segments are stringified to
// "all" so the unfiltered cache is its own bucket.
export function productOptionsQueryKey(
  categoryId: string | null,
): readonly ["products", "options", string] {
  return ["products", "options", categoryId ?? "all"] as const
}

export type ProductOptionsResponse = {
  options: ProductPickerOption[]
}

export async function searchProductOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  categoryId: string | null = null,
  take = 20,
): Promise<ProductPickerOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (categoryId) params.set("categoryId", categoryId)
  params.set("take", String(take))
  const url = `/api/products/options?${params.toString()}`
  const result = await requestJson<ProductOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
