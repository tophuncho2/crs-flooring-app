import type { ProductOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PRODUCT_OPTIONS_QUERY_KEY = ["products", "options"] as const

export type ProductOptionsPage = {
  items: ProductOption[]
  hasMore: boolean
}

export type ProductOptionsRequestArgs = {
  categoryId?: string
  style?: string
  color?: string
  namingAddon?: string
  skip?: number
  take?: number
}

export async function searchProductOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ProductOptionsRequestArgs = {},
): Promise<ProductOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.categoryId) params.set("categoryId", args.categoryId)
  if (args.style) params.set("style", args.style)
  if (args.color) params.set("color", args.color)
  if (args.namingAddon) params.set("namingAddon", args.namingAddon)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/products/options?${params.toString()}`
  return requestJson<ProductOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
