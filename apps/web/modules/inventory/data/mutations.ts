"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { InventoryDetailRecord, InventoryRecord } from "@builders/db"
import type { UpdateInventoryInput } from "@builders/application"
import type { CutLogsDiff } from "@builders/domain"

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

// ---------------------------------------------------------------------------
// Cut-log section mutations (sweep 7)
// ---------------------------------------------------------------------------

export type SaveCutLogPendingDiffResponse = {
  batch: {
    outboxEventId: string
    wasDuplicate: boolean
    tempIdMap: Record<string, string>
  }
}

/**
 * Producer call: PATCH the cut-logs section with a diff. Server returns
 * 202 + `{ batch: { outboxEventId, wasDuplicate, tempIdMap } }`. The
 * worker applies the diff under the per-inventory FOR UPDATE lock; the
 * controller does optimistic local updates immediately on this response.
 *
 * `revisionKey` rides in `withMutationMeta` as the idempotency key.
 * No `expectedUpdatedAt` — per-row optimistic locks live inside the diff
 * entries themselves (each `modified[i].expectedUpdatedAt` and
 * `deleted[i].expectedUpdatedAt` is checked under the worker's lock).
 */
export async function saveCutLogPendingDiffRequest(
  inventoryId: string,
  diff: CutLogsDiff,
  revisionKey: string,
): Promise<SaveCutLogPendingDiffResponse> {
  return requestJson<SaveCutLogPendingDiffResponse>(
    `/api/inventory/${inventoryId}/cut-logs/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ diff }, revisionKey)),
    },
  )
}

export type MarkCutLogsForFinalizeResponse = {
  batch: {
    markedRowIds: string[]
    outboxEventId: string
    wasDuplicate: boolean
  }
}

/**
 * Producer call: POST a batch of cut-log ids to mark for finalize. Server
 * flips them PENDING → QUEUED, writes outbox event, returns 202 + `{
 * batch: { markedRowIds, outboxEventId, wasDuplicate } }`. Worker stamps
 * `before` / `after` / `finalCutSequence` / `status: FINAL` /
 * `isFinal: true` per row asynchronously.
 */
export async function markCutLogsForFinalizeRequest(
  inventoryId: string,
  cutLogIds: string[],
  revisionKey: string,
): Promise<MarkCutLogsForFinalizeResponse> {
  return requestJson<MarkCutLogsForFinalizeResponse>(
    `/api/inventory/${inventoryId}/cut-logs/finalize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ cutLogIds }, revisionKey)),
    },
  )
}

export type { InventoryRecord, InventoryDetailRecord }
