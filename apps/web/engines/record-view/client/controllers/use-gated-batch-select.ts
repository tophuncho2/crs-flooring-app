"use client"

import { useCallback, useMemo } from "react"
import {
  useBatchSelectAction,
  type UseBatchSelectActionArgs,
  type UseBatchSelectActionResult,
} from "./use-batch-select-action"

/**
 * Section-aware wrapper around `useBatchSelectAction`. Adds:
 *
 *  - `canToggleSelection` — false while the section is dirty / saving / busy,
 *    so the consumer's per-row selection checkbox can gate `editable` on it.
 *    Closes the gap where users could mark rows for a batch action while the
 *    section had unsaved edits, silently abandoning those edits when the
 *    batch fired.
 *
 *  - `isSelectionActive` — true once any row is selected, so the consumer
 *    can lock per-row data cells (and section action buttons) for the duration
 *    of the batch-prep window. Closes the gap where edits could land
 *    underneath a pending selection.
 *
 *  - `eligibleCount` + `toggleAllEligible` — the missing "Select All Eligible /
 *    Clear" affordance. The button primitive
 *    (`apps/web/components/features/select-batch/SelectAllButton`) wires
 *    directly to these.
 *
 * Convention: caller passes the section's dirty + busy flags; the hook
 * derives `canToggleSelection` from them plus the underlying primitive's
 * `isFiring` (so the user can't toggle while a batch is mid-flight either).
 *
 * Builds on top of `useBatchSelectAction` rather than replacing it — the
 * primitive stays usable for non-section consumers that don't need gating.
 */

export type UseGatedBatchSelectArgs<TRow extends { id: string }> = UseBatchSelectActionArgs<TRow> & {
  /** True while the section has unsaved edits (drafts vs server). */
  isSectionDirty: boolean
  /**
   * True while the section is in any in-flight state where selection toggles
   * should be blocked (e.g. `isSaving`). Combined with the primitive's
   * `isFiring` to derive `canToggleSelection`.
   */
  isSectionBusy: boolean
}

export type UseGatedBatchSelectResult = UseBatchSelectActionResult & {
  isSelectionActive: boolean
  canToggleSelection: boolean
  eligibleCount: number
  toggleAllEligible: () => void
}

export function useGatedBatchSelect<TRow extends { id: string }>({
  rows,
  isEligible,
  performAction,
  onOptimisticUpdate,
  isSectionDirty,
  isSectionBusy,
}: UseGatedBatchSelectArgs<TRow>): UseGatedBatchSelectResult {
  const batch = useBatchSelectAction<TRow>({
    rows,
    isEligible,
    performAction,
    onOptimisticUpdate,
  })

  // Eligible row ids in the current snapshot — full set, not just selected.
  // Recomputes on each `rows` change so a row that drifted state since the
  // user last interacted (e.g. a worker flipped its status) is reflected
  // automatically. Kept stable across renders that don't change `rows` so
  // the resulting `toggleAllEligible` callback identity stays steady too.
  const eligibleIds = useMemo(() => {
    return rows.filter(isEligible).map((row) => row.id)
  }, [rows, isEligible])

  const eligibleCount = eligibleIds.length
  const isSelectionActive = batch.selectedIds.size > 0
  const canToggleSelection = !isSectionDirty && !isSectionBusy && !batch.isFiring

  const toggleAllEligible = useCallback(() => {
    if (isSelectionActive) {
      batch.clearSelection()
      return
    }
    batch.setSelected(new Set(eligibleIds))
  }, [batch, isSelectionActive, eligibleIds])

  return {
    ...batch,
    isSelectionActive,
    canToggleSelection,
    eligibleCount,
    toggleAllEligible,
  }
}
