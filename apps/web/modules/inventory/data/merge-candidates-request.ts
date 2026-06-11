import type { InventoryListFilters, ListInput, ListOutput } from "@builders/application"
import type { InventoryRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_MERGE_CANDIDATES_QUERY_KEY = ["inventory", "merge-candidates"] as const

/**
 * Candidate-list request for the inventory merge picker. Shares the
 * `ListInput<InventoryListFilters>` signature with `listInventoryRequest` so the
 * shared options-grid controller can swap one for the other, but only the
 * merge-relevant filters cross the wire (single product scope + the four
 * identity bars + optional warehouse). Hits `/api/inventory/merge-candidates`,
 * which excludes archived, already-merged, and zero-balance rows.
 */
export async function mergeInventoryCandidatesRequest(
  input: ListInput<InventoryListFilters>,
): Promise<ListOutput<InventoryRow>> {
  const params = new URLSearchParams()
  const productId = input.filters?.productId?.[0]?.trim()
  if (productId) params.set("productId", productId)
  const warehouseId = input.filters?.warehouseId?.[0]?.trim()
  if (warehouseId) params.set("warehouseId", warehouseId)
  for (const key of ["invNumber", "rollNumber", "dyeLot", "note"] as const) {
    const value = input.filters?.[key]?.trim()
    if (value && value.length > 0) params.set(key, value)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))

  const queryString = params.toString()
  const url = queryString
    ? `/api/inventory/merge-candidates?${queryString}`
    : "/api/inventory/merge-candidates"
  return requestJson<ListOutput<InventoryRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}
