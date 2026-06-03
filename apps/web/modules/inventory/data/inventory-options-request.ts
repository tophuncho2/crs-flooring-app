import type { InventoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_OPTIONS_SEARCH_QUERY_KEY = ["inventory", "options", "search"] as const

export type InventoryOptionsPage = {
  items: InventoryOption[]
  hasMore: boolean
}

export type InventoryOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  /**
   * Free-text location filter chip — server-side ILIKE on `inventory.location`.
   * Independent from the four identity search bars below.
   */
  location?: string
  /**
   * Per-field identity search bars — each an independent server-side ILIKE on
   * its own column (`inventory_number` / `rollNumber` / `dyeLot` / `note`),
   * AND'd together. Mirrors the inventory list view's column search bars.
   */
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
  skip?: number
  take?: number
}

/**
 * Infinite-scroll picker/list search. Returns one page (`{ items, hasMore }`);
 * the dropdown controller calls this with increasing `skip`. Powers the
 * adjustment inventory picker (filters = warehouse + product + location + the
 * four identity columns).
 */
export async function searchInventoryOptionsRequest(
  signal: AbortSignal | undefined,
  args: InventoryOptionsRequestArgs,
): Promise<InventoryOptionsPage> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (args.productId) params.set("productId", args.productId)
  if (args.location) params.set("location", args.location)
  if (args.invNumber) params.set("invNumber", args.invNumber)
  if (args.rollNumber) params.set("rollNumber", args.rollNumber)
  if (args.dyeLot) params.set("dyeLot", args.dyeLot)
  if (args.note) params.set("note", args.note)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/options/search?${params.toString()}`
  return requestJson<InventoryOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
