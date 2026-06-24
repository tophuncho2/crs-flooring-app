"use client"

import { useMutation } from "@tanstack/react-query"
import { markStagedRowsForImportRequest } from "@/modules/imports/data/mutations"
import type { ImportReconcileResponse } from "../../drafts"

type Deps = {
  importId: string
  markRowsQueued: (markedIds: string[]) => void
  reconcileAfterWrite: (response: ImportReconcileResponse) => void
}

/**
 * Mark-for-import worker trigger. POST returns the set of row ids the
 * worker accepted; caller optimistically flips DRAFT → QUEUED in the local
 * snapshot via `markRowsQueued`. Consumed by the staged-row selection slice
 * as the `performAction` of `useGatedBatchSelect`. The record controller's
 * queued→imported poll then drives QUEUED → IMPORTED.
 *
 * Marking also stamps the parent import (aggregate-root actor), so the
 * response carries the fresh detail — route it through `reconcileAfterWrite`
 * to keep the shared record's OCC token current for the next save.
 */
export function useMarkForImportMutation({
  importId,
  markRowsQueued,
  reconcileAfterWrite,
}: Deps) {
  return useMutation({
    mutationFn: (ids: string[]) => markStagedRowsForImportRequest(importId, ids),
    onSuccess: (result) => {
      markRowsQueued(result.batch.markedRowIds)
      reconcileAfterWrite({ import: result.import })
    },
  })
}
