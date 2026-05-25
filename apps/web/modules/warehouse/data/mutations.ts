"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { WarehouseForm } from "@builders/domain"
import type { WarehouseRecord } from "@builders/db"

export async function createWarehouseRequest(input: WarehouseForm) {
  return requestJson<{ warehouse: WarehouseRecord }>("/api/warehouses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateWarehouseRequest(id: string, input: WarehouseForm, revisionKey: string) {
  return requestJson<{ warehouse: WarehouseRecord }>(`/api/warehouses/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteWarehouseRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/warehouses/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
