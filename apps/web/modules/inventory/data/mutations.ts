"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { InventoryDetailRecord, InventoryRecord } from "@builders/db"
import type { CreateInventoryInput, UpdateInventoryInput } from "@builders/application"

export async function createInventoryRequest(input: CreateInventoryInput) {
  return requestJson<{ inventory: InventoryRecord }>("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateInventoryRequest(
  id: string,
  input: UpdateInventoryInput,
  revisionKey: string,
) {
  return requestJson<{ inventory: InventoryRecord }>(`/api/inventory/${id}/primary/section`, {
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

/**
 * Shell for Sweep 3 — cut-logs section save. The parent-scoped route
 * `/api/inventory/[id]/cut-logs/section` doesn't exist yet; this helper throws
 * when invoked. Exported so the cut-logs-section controller shell can reference
 * a stable symbol.
 */
export async function updateInventoryCutLogsRequest(
  _id: string,
  _diff: unknown,
  _revisionKey: string,
): Promise<never> {
  throw new Error(
    "updateInventoryCutLogsRequest is not wired yet — implemented in Sweep 3",
  )
}

export type { InventoryRecord, InventoryDetailRecord }
