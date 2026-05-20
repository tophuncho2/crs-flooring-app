"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { InventoryDetailRecord, InventoryRecord } from "@builders/db"
import type { UpdateInventoryInput } from "@builders/application"

export async function updateInventoryRequest(
  id: string,
  input: UpdateInventoryInput,
  revisionKey: string,
) {
  return requestJson<{ inventory: InventoryDetailRecord }>(`/api/inventory/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteInventoryRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/inventory/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

export type { InventoryRecord, InventoryDetailRecord }
