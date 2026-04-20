"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { SectionsWithLocationsDiff, WarehouseForm } from "@builders/domain"
import type { WarehouseDetailRecord, WarehouseRecord } from "@builders/db"

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

export async function updateSectionsWithLocationsRequest(
  id: string,
  diff: SectionsWithLocationsDiff,
  revisionKey: string,
) {
  return requestJson<{ warehouse: WarehouseDetailRecord; tempIdMap: Record<string, string> }>(
    `/api/warehouses/${id}/sections-locations/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(diff as unknown as Record<string, unknown>, revisionKey)),
    },
  )
}
