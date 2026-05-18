"use client"

import { useMutation } from "@tanstack/react-query"
import type { WorkOrderMaterialItemsDiff } from "@builders/domain"
import { saveWorkOrderMaterialItemsSectionRequest } from "@/modules/work-orders/data/mutations"

type Deps = {
  workOrderId: string
}

/**
 * Atomic material-items diff save. Consumed by the rows slice inside
 * `useRecordScopedSectionController`'s `onSave` callback — the engine owns
 * the publish + revisionKey reconciliation, so this hook keeps only the
 * request side. Mirrors `useSaveFilterRowsMutation` in the imports
 * staged-inventory module.
 */
export function useSaveMaterialItemsMutation({ workOrderId }: Deps) {
  return useMutation({
    mutationFn: (input: { diff: WorkOrderMaterialItemsDiff; revisionKey: string }) =>
      saveWorkOrderMaterialItemsSectionRequest(workOrderId, input.diff, input.revisionKey),
  })
}
