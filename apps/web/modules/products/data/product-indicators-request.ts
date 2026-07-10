"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  InventoryIndicatorDetail,
  InventoryIndicatorNeighbors,
  InventoryIndicatorPage,
  InventoryIndicatorRow,
} from "@builders/domain"

export const PRODUCT_INDICATORS_QUERY_KEY = ["products", "indicators"] as const

/** Paginated section read of one product's indicators. */
export async function productIndicatorsPageRequest(
  productId: string,
  args: { skip: number; take: number },
  signal?: AbortSignal,
): Promise<InventoryIndicatorPage> {
  const params = new URLSearchParams({
    skip: String(args.skip),
    take: String(args.take),
  })
  const { page } = await requestJson<{ page: InventoryIndicatorPage }>(
    `/api/products/${productId}/indicators?${params.toString()}`,
    { method: "GET", headers: { Accept: "application/json" }, signal },
  )
  return page
}

/** Single indicator (with neighbors) by id, scoped to its product. */
export async function productIndicatorByIdRequest(
  productId: string,
  indicatorId: string,
  signal?: AbortSignal,
): Promise<InventoryIndicatorDetail> {
  const { indicator } = await requestJson<{ indicator: InventoryIndicatorDetail }>(
    `/api/products/${productId}/indicators/${indicatorId}`,
    { method: "GET", headers: { Accept: "application/json" }, signal },
  )
  return indicator
}

/** Prev/next indicator within the product, for the section stepper. */
export async function productIndicatorNeighborsRequest(
  productId: string,
  indicatorId: string,
  signal?: AbortSignal,
): Promise<InventoryIndicatorNeighbors> {
  const { neighbors } = await requestJson<{ neighbors: InventoryIndicatorNeighbors }>(
    `/api/products/${productId}/indicators/${indicatorId}/neighbors`,
    { method: "GET", headers: { Accept: "application/json" }, signal },
  )
  return neighbors
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

export type UpdateIndicatorRequestPatch = {
  lowStockThreshold?: string
  internalNotes?: string
  isActive?: boolean
}

/** Update one indicator's editable subset (OCC via `expectedUpdatedAt`). Returns the updated row. */
export async function updateIndicatorRequest(
  productId: string,
  indicatorId: string,
  patch: UpdateIndicatorRequestPatch,
  expectedUpdatedAt: string,
): Promise<InventoryIndicatorRow> {
  return requestJson<InventoryIndicatorRow>(
    `/api/products/${productId}/indicators/${indicatorId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ patch }, expectedUpdatedAt)),
    },
  )
}

/** Delete one indicator (OCC via `expectedUpdatedAt`). */
export async function deleteIndicatorRequest(
  productId: string,
  indicatorId: string,
  expectedUpdatedAt: string,
): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(
    `/api/products/${productId}/indicators/${indicatorId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
    },
  )
}
