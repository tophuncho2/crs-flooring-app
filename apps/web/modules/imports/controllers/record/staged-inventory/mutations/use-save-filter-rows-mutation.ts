"use client"

import { useMutation } from "@tanstack/react-query"
import type { StagedInventoryFiltersDiff } from "@builders/domain"
import { updateImportStagedInventoryRequest } from "@/modules/imports/data/mutations"

type Deps = {
  importId: string
}

/**
 * Atomic filter-row diff save. Consumed by the filter-rows slice inside
 * `useRecordScopedSectionController`'s `onSave` callback — the engine owns
 * the publish + revisionKey reconciliation, so this hook keeps only the
 * request side.
 */
export function useSaveFilterRowsMutation({ importId }: Deps) {
  return useMutation({
    mutationFn: (input: { diff: StagedInventoryFiltersDiff; revisionKey: string }) =>
      updateImportStagedInventoryRequest(importId, input.diff, input.revisionKey),
  })
}
