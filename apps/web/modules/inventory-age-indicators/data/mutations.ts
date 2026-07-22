"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { InventoryAgeIndicator, InventoryAgeIndicatorForm } from "@builders/domain"

export async function createInventoryAgeIndicatorRequest(input: InventoryAgeIndicatorForm) {
  return requestJson<{ inventoryAgeIndicator: InventoryAgeIndicator }>(
    "/api/inventory-age-indicators",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input)),
    },
  )
}

export async function updateInventoryAgeIndicatorRequest(
  id: string,
  input: InventoryAgeIndicatorForm,
  revisionKey: string,
) {
  return requestJson<{ inventoryAgeIndicator: InventoryAgeIndicator }>(
    `/api/inventory-age-indicators/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteInventoryAgeIndicatorRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/inventory-age-indicators/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
