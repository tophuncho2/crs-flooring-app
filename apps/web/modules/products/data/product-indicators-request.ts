"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import {
  INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE,
  type InventoryIndicatorPage,
  type InventoryIndicatorRow,
  type InventoryIndicatorsSectionDiff,
} from "@builders/domain"

export const PRODUCT_INDICATORS_QUERY_KEY = ["products", "indicators"] as const

/**
 * Full-list section read of one product's indicators — the co-fetch source for
 * the inline-editable Indicators section. Indicator counts per product are tiny
 * (product × warehouses × units), so the whole set is fetched in one call (up to
 * the section cap); `hasMore` flags the rare overflow so the UI can note it.
 */
export async function productIndicatorsAllRequest(
  productId: string,
  signal?: AbortSignal,
): Promise<InventoryIndicatorPage> {
  const params = new URLSearchParams({
    skip: "0",
    take: String(INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE),
  })
  const { page } = await requestJson<{ page: InventoryIndicatorPage }>(
    `/api/products/${productId}/indicators?${params.toString()}`,
    { method: "GET", headers: { Accept: "application/json" }, signal },
  )
  return page
}

export type CreateIndicatorRequestBody = {
  warehouseId: string
  unitId: string
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

/** Create one indicator on the product. Returns the inserted row. */
export async function createIndicatorRequest(
  productId: string,
  body: CreateIndicatorRequestBody,
): Promise<InventoryIndicatorRow> {
  return requestJson<InventoryIndicatorRow>(`/api/products/${productId}/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ ...body })),
  })
}

/**
 * Atomic diff-save of the Indicators section — one PATCH persisting every edit +
 * delete. `expectedUpdatedAt` is the parent product's OCC token. Returns the
 * product's fresh indicator rows for the section to reconcile.
 */
export async function saveIndicatorsSectionRequest(
  productId: string,
  diff: InventoryIndicatorsSectionDiff,
  expectedUpdatedAt: string,
): Promise<{ indicators: InventoryIndicatorRow[] }> {
  return requestJson<{ indicators: InventoryIndicatorRow[] }>(
    `/api/products/${productId}/indicators/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        withMutationMeta(diff as unknown as Record<string, unknown>, expectedUpdatedAt),
      ),
    },
  )
}
