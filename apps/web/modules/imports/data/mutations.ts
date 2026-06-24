"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  ImportRecord,
  ImportDetailRecord,
  StagedInventoryFilterRecord,
  StagedInventoryRecord,
} from "@builders/db"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type { ImportStagedInventorySectionDiff } from "@builders/domain"

export async function createImportRequest(input: CreateImportInput) {
  return requestJson<{ import: ImportRecord }>("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateImportRequest(id: string, input: UpdateImportInput, revisionKey: string) {
  return requestJson<{ import: ImportDetailRecord }>(`/api/imports/${id}/primary/section`, {
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

// --- Combined section diff (atomic save: filter rows + staged rows) ---

export async function updateImportStagedInventoryRequest(
  importId: string,
  diff: ImportStagedInventorySectionDiff,
  revisionKey: string,
) {
  return requestJson<{
    import: ImportDetailRecord
    filterRows: StagedInventoryFilterRecord[]
    stagedRows: StagedInventoryRecord[]
    filterTempIdMap: Record<string, string>
    rowTempIdMap: Record<string, string>
  }>(`/api/imports/${importId}/staged-inventory/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(diff, revisionKey)),
  })
}

// --- Mark-for-import (worker trigger, 202-async producer) ---

export async function markStagedRowsForImportRequest(
  importId: string,
  stagedRowIds: string[],
) {
  return requestJson<{
    batch: { markedRowIds: string[]; outboxEventId: string; wasDuplicate: boolean }
    // Fresh parent detail (updatedAt/updatedBy stamped by the mark) so the
    // client can resync the record's OCC token. Null only if the row vanished.
    import: ImportDetailRecord | null
  }>(`/api/imports/${importId}/staged-inventory-rows/mark-for-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ stagedRowIds })),
  })
}

export type { ImportRecord, ImportDetailRecord }
