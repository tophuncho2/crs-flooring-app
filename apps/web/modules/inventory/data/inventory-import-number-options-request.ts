import type { InventoryImportNumberOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_IMPORT_NUMBERS_SEARCH_QUERY_KEY = [
  "inventory",
  "import-numbers",
  "options",
  "search",
] as const

export type InventoryImportNumbersPage = {
  items: InventoryImportNumberOption[]
  hasMore: boolean
}

export type InventoryImportNumbersRequestArgs = {
  skip?: number
  take?: number
}

export async function searchInventoryImportNumbersRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryImportNumbersRequestArgs = {},
): Promise<InventoryImportNumbersPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/import-numbers/search?${params.toString()}`
  return requestJson<InventoryImportNumbersPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
