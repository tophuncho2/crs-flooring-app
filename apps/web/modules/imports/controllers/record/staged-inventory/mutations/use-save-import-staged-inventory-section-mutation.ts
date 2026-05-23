"use client"

import { useMutation } from "@tanstack/react-query"
import type { ImportStagedInventorySectionDiff } from "@builders/domain"
import { updateImportStagedInventoryRequest } from "@/modules/imports/data/mutations"

type Deps = {
  importId: string
}

/**
 * Atomic combined-section diff save (filter rows + staged rows). Consumed
 * by the section slice inside `useRecordScopedSectionController`'s
 * `onSave` callback — the engine owns the publish + revisionKey
 * reconciliation, so this hook keeps only the request side.
 */
export function useSaveImportStagedInventorySectionMutation({ importId }: Deps) {
  return useMutation({
    mutationFn: (input: {
      diff: ImportStagedInventorySectionDiff
      revisionKey: string
    }) => updateImportStagedInventoryRequest(importId, input.diff, input.revisionKey),
  })
}
