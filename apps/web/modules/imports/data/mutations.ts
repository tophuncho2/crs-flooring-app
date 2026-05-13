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
import type {
  StagedInventoryFiltersDiff,
  StagedInventoryForm,
} from "@builders/domain"

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

// --- Filter-rows section diff (atomic save, mirrors WOMI material items) ---

export async function updateImportStagedInventoryFilterRowsRequest(
  importId: string,
  diff: StagedInventoryFiltersDiff,
  revisionKey: string,
) {
  return requestJson<{
    import: ImportDetailRecord
    filterRows: StagedInventoryFilterRecord[]
    tempIdMap: Record<string, string>
  }>(`/api/imports/${importId}/staged-inventory-filter-rows/section`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({ ...diff }, revisionKey)),
  })
}

// --- Per-row staged-inv-row CRUD (no section diff — each row is its own
// synchronous mutation, mirrors the cut-log per-row pattern) ---

export type StagedInventoryRowMutationResponse = {
  row: StagedInventoryRecord
  filterRow: StagedInventoryFilterRecord
}

export type DeleteStagedInventoryRowResponse = {
  deletedId: string
  filterRow: StagedInventoryFilterRecord
}

export async function createStagedInventoryRowRequest(args: {
  importId: string
  filterRowId: string
  form: StagedInventoryForm
}) {
  return requestJson<StagedInventoryRowMutationResponse>(
    `/api/imports/${args.importId}/staged-inventory-rows`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        withMutationMeta({ filterRowId: args.filterRowId, form: args.form }),
      ),
    },
  )
}

export async function updateStagedInventoryRowRequest(args: {
  importId: string
  rowId: string
  form: StagedInventoryForm
  expectedUpdatedAt: string
}) {
  return requestJson<StagedInventoryRowMutationResponse>(
    `/api/imports/${args.importId}/staged-inventory-rows/${args.rowId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        withMutationMeta({ form: args.form }, args.expectedUpdatedAt),
      ),
    },
  )
}

export async function deleteStagedInventoryRowRequest(args: {
  importId: string
  rowId: string
  expectedUpdatedAt: string
}) {
  return requestJson<DeleteStagedInventoryRowResponse>(
    `/api/imports/${args.importId}/staged-inventory-rows/${args.rowId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({}, args.expectedUpdatedAt)),
    },
  )
}

// --- Mark-for-import (worker trigger, 202-async producer) ---

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
