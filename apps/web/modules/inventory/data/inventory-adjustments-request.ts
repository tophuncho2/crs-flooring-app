"use client"

import type {
  EnrichedInventoryAdjustmentPage,
  EnrichedInventoryAdjustmentRow,
  InventoryAdjustmentNeighbors,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_ADJUSTMENTS_QUERY_KEY = ["inventory", "adjustments"] as const

type InventoryAdjustmentsPageResponse = {
  page: EnrichedInventoryAdjustmentPage
}

export async function inventoryAdjustmentsPageRequest(
  inventoryId: string,
  skip: number,
  take: number,
  signal: AbortSignal | undefined,
): Promise<EnrichedInventoryAdjustmentPage> {
  const params = new URLSearchParams()
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const result = await requestJson<InventoryAdjustmentsPageResponse>(
    `/api/inventory/${inventoryId}/adjustments?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}

/**
 * Fetch a single enriched adjustment by id (scoped to its inventory). Used to
 * resolve a deep-linked adjustment (`?adjustment=<id>`) when the row isn't on
 * the record view's first loaded page.
 */
export async function inventoryAdjustmentByIdRequest(
  inventoryId: string,
  adjustmentId: string,
  signal?: AbortSignal,
): Promise<EnrichedInventoryAdjustmentRow> {
  const result = await requestJson<{ adjustment: EnrichedInventoryAdjustmentRow }>(
    `/api/inventory/${inventoryId}/adjustments/${adjustmentId}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.adjustment
}

/**
 * Prev/next neighbors of an adjustment within its parent inventory's ledger
 * (chronological, crossing page boundaries). Powers the record-view
 * Adjustments-section stepper. Each neighbor is `{ id, adjustmentNumber }` or
 * null at the ends.
 */
export async function inventoryAdjustmentNeighborsRequest(
  inventoryId: string,
  adjustmentId: string,
  signal?: AbortSignal,
): Promise<InventoryAdjustmentNeighbors> {
  const result = await requestJson<{ neighbors: InventoryAdjustmentNeighbors }>(
    `/api/inventory/${inventoryId}/adjustments/${adjustmentId}/neighbors`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.neighbors
}
