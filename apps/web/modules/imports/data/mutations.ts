"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ImportRecord, ImportDetailRecord, StagedInventoryRecord } from "@builders/db"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type { StagedInventoryRowsDiff } from "@builders/domain"

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

export async function updateImportStagedInventoryRowsRequest(
  importId: string,
  diff: StagedInventoryRowsDiff,
  revisionKey: string,
) {
  return requestJson<{
    import: ImportDetailRecord
    stagedRows: StagedInventoryRecord[]
    tempIdMap: Record<string, string>
  }>(
    `/api/imports/${importId}/staged-inventory-rows/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ diff }, revisionKey)),
    },
  )
}

/**
 * Posts a batch of staged-row ids to the worker-trigger endpoint. The route
 * is a 202-async producer: a duplicate idempotency key resolves to the same
 * outbox event id and `wasDuplicate: true`. The next sweep wires this into a
 * controller + button on the staged-rows section.
 */
export async function markStagedRowsForImportRequest(
  importId: string,
  stagedRowIds: string[],
) {
  return requestJson<{
    batch: { markedRowIds: string[]; outboxEventId: string; wasDuplicate: boolean }
  }>(`/api/imports/${importId}/staged-inventory-rows/mark-for-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ stagedRowIds })),
  })
}

export type { ImportRecord, ImportDetailRecord }
