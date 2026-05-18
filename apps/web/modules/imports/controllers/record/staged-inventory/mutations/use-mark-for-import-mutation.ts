"use client"

import { useMutation } from "@tanstack/react-query"
import { markStagedRowsForImportRequest } from "@/modules/imports/data/mutations"

type Deps = {
  importId: string
  publishMarkedForImport: (markedIds: string[]) => void
}

/**
 * Mark-for-import worker trigger. POST returns the set of row ids the
 * worker accepted; caller optimistically flips DRAFT → QUEUED in the local
 * snapshot via `publishMarkedForImport`. Consumed by the staged-row
 * selection slice as the `performAction` of `useGatedBatchSelect`.
 */
export function useMarkForImportMutation({
  importId,
  publishMarkedForImport,
}: Deps) {
  return useMutation({
    mutationFn: (ids: string[]) => markStagedRowsForImportRequest(importId, ids),
    onSuccess: (result) => {
      publishMarkedForImport(result.batch.markedRowIds)
    },
  })
}
