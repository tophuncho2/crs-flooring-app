"use client"

import { useMutation } from "@tanstack/react-query"
import type { ImportDetail } from "@builders/domain"
import { markStagedRowsForImportRequest } from "@/modules/imports/data/mutations"

type Deps = {
  importId: string
  publishMarkedForImport: (markedIds: string[]) => void
  publishRecord: (record: ImportDetail) => void
}

/**
 * Mark-for-import worker trigger. POST returns the set of row ids the
 * worker accepted; caller optimistically flips DRAFT → QUEUED in the local
 * snapshot via `publishMarkedForImport`. Consumed by the staged-row
 * selection slice as the `performAction` of `useGatedBatchSelect`.
 *
 * Marking also stamps the parent import (aggregate-root actor), so the
 * response carries the fresh detail — push it into the shared record via
 * `publishRecord` to keep the OCC token current for the next save.
 */
export function useMarkForImportMutation({
  importId,
  publishMarkedForImport,
  publishRecord,
}: Deps) {
  return useMutation({
    mutationFn: (ids: string[]) => markStagedRowsForImportRequest(importId, ids),
    onSuccess: (result) => {
      publishMarkedForImport(result.batch.markedRowIds)
      if (result.import) publishRecord(result.import)
    },
  })
}
