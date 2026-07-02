"use client"

import { useCallback } from "react"
import { canImportStagedRow, type StagedInventoryRow } from "@builders/domain"
import { useGatedBatchSelect } from "@/engines/record-view"
import type { ImportReconcileResponse } from "../drafts"
import { useMarkForImportMutation } from "./mutations/use-mark-for-import-mutation"

/**
 * Staged-row selection slice. Wraps `useGatedBatchSelect` for the
 * mark-for-import flow: eligibility is the shared domain predicate
 * `canImportStagedRow` (DRAFT + product + unit + warehouse + positive stock) —
 * the SAME rule the server enforces at mark-for-import, so a row that can't be
 * imported can't be selected. Batch fire, gated by section dirty/busy state.
 *
 * Shape mirrors the future shared `useBatchSelectionSection` — when
 * WOMI/adjustments adopts batch selection, `useMarkForImportMutation` becomes
 * one of N action mutations supplied to a generic version of this hook.
 */
export function useImportStagedRowSelection({
  importId,
  stagedRows,
  markRowsQueued,
  reconcileAfterWrite,
  isSectionDirty,
  isSectionBusy,
}: {
  importId: string
  stagedRows: StagedInventoryRow[]
  markRowsQueued: (markedIds: string[]) => void
  reconcileAfterWrite: (response: ImportReconcileResponse) => void
  isSectionDirty: boolean
  isSectionBusy: boolean
}) {
  const markMutation = useMarkForImportMutation({
    importId,
    markRowsQueued,
    reconcileAfterWrite,
  })

  const performAction = useCallback(
    async (ids: string[]) => {
      await markMutation.mutateAsync(ids)
    },
    [markMutation],
  )

  const batch = useGatedBatchSelect<StagedInventoryRow>({
    rows: stagedRows,
    // Single source of truth with the server's mark-for-import gate — closes the
    // drift where a unit-less (or zero-stock) row was selectable client-side but
    // rejected server-side.
    isEligible: canImportStagedRow,
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
