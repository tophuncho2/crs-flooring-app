import type { ProductOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PRODUCT_OPTIONS_QUERY_KEY = ["products", "options"] as const

export type ProductOptionsResponse = {
  options: ProductOption[]
}

export type ProductOptionsRequestArgs = {
  categoryId?: string
  take?: number
}

export async function searchProductOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ProductOptionsRequestArgs = {},
): Promise<ProductOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.categoryId) params.set("categoryId", args.categoryId)
  params.set("take", String(args.take ?? 20))
  const url = `/api/products/options?${params.toString()}`
  const result = await requestJson<ProductOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
