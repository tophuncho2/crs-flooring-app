"use client"

import { useCallback } from "react"
import type { ImportDetail, StagedInventoryRow } from "@builders/domain"
import { useGatedBatchSelect } from "@/engines/record-view"
import { useMarkForImportMutation } from "./mutations/use-mark-for-import-mutation"

/**
 * Staged-row selection slice. Wraps `useGatedBatchSelect` for the
 * mark-for-import flow: eligibility (DRAFT + productId + startingStock),
 * batch fire, gated by section dirty/busy state.
 *
 * Shape mirrors the future shared `useBatchSelectionSection` — when
 * WOMI/adjustments adopts batch selection, `useMarkForImportMutation` becomes
 * one of N action mutations supplied to a generic version of this hook.
 */
export function useImportStagedRowSelection({
  importId,
  stagedRows,
  publishMarkedForImport,
  publishRecord,
  isSectionDirty,
  isSectionBusy,
}: {
  importId: string
  stagedRows: StagedInventoryRow[]
  publishMarkedForImport: (markedIds: string[]) => void
  publishRecord: (record: ImportDetail) => void
  isSectionDirty: boolean
  isSectionBusy: boolean
}) {
  const markMutation = useMarkForImportMutation({
    importId,
    publishMarkedForImport,
    publishRecord,
  })

  const performAction = useCallback(
    async (ids: string[]) => {
      await markMutation.mutateAsync(ids)
    },
    [markMutation],
  )

  const batch = useGatedBatchSelect<StagedInventoryRow>({
    rows: stagedRows,
    isEligible: (row) => {
      if (row.status !== "DRAFT") return false
      if (!row.productId) return false
      if (!row.startingStock) return false
      return true
    },
    performAction,
    isSectionDirty,
    isSectionBusy,
  })

  return {
    selectedIds: batch.selectedIds,
    toggleSelection: batch.toggleSelected,
    clearSelection: batch.clearSelection,
    eligibleSelectedIds: batch.eligibleSelectedIds,
    isMarking: batch.isFiring,
    markError: batch.error,
    markForImport: batch.fire,
    isSelectionActive: batch.isSelectionActive,
    canToggleSelection: batch.canToggleSelection,
    eligibleCount: batch.eligibleCount,
    toggleAllEligible: batch.toggleAllEligible,
  }
}
