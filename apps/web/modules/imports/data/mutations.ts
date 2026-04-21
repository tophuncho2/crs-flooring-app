"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ImportRecord, ImportDetailRecord } from "@builders/db"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type { InventoryRowsDiff } from "@builders/domain"

export async function createImportRequest(input: CreateImportInput) {
  return requestJson<{ import: ImportRecord }>("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateImportRequest(id: string, input: UpdateImportInput, revisionKey: string) {
  return requestJson<{ import: ImportRecord }>(`/api/imports/${id}/primary/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteImportRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/imports/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

export async function updateImportInventoryRowsRequest(
  importId: string,
  diff: InventoryRowsDiff,
  revisionKey: string,
) {
  return requestJson<{ import: ImportDetailRecord; tempIdMap: Record<string, string> }>(
    `/api/imports/${importId}/inventory-rows/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ diff }, revisionKey)),
    },
  )
}

export type { ImportRecord, ImportDetailRecord }
