"use client"

import { useCallback, useMemo, useState } from "react"

/**
 * Generic batch-select-then-fire-action hook.
 *
 * Extracted from the inline pattern that staged-inv's
 * `useImportStagedInventoryRowsSection` (mark-for-import) and the
 * cut-logs `useInventoryCutLogsSection` (finalize-selected) both want.
 *
 * Owns the selection `Set<string>` keyed by row id, an `eligibleSelectedIds`
 * projection (filtered via the caller's `isEligible` predicate), and the
 * `fire()` callback that calls `performAction(eligibleSelectedIds)` with
 * its own `isFiring` / `error` lifecycle. Optimistic local-state updates
 * fire after `performAction` resolves so the section can flip the touched
 * rows to a transient state (e.g. `status: "QUEUED"`) immediately.
 *
 * Convention: row ids correspond to the section's persisted `serverRows`
 * (NOT locally-added drafts). Locally-added drafts have client-only ids
 * and aren't selectable for batch actions — that's a feature, not a
 * limitation: the worker only consumes persisted rows.
 */

export type UseBatchSelectActionArgs<TRow extends { id: string }> = {
  rows: ReadonlyArray<TRow>
  isEligible: (row: TRow) => boolean
  performAction: (selectedIds: string[]) => Promise<void>
  /**
   * Optional optimistic local-state mutation to apply on success.
   * Caller decides what to do (e.g., flip rows to a transient
   * `status: "QUEUED"` state). Runs AFTER `performAction` resolves,
   * BEFORE selection is cleared.
   */
  onOptimisticUpdate?: (selectedIds: string[]) => void
}

export type UseBatchSelectActionResult = {
  selectedIds: Set<string>
  eligibleSelectedIds: string[]
  isFiring: boolean
  error: string | null
  toggleSelected: (id: string) => void
  setSelected: (ids: Set<string>) => void
  clearSelection: () => void
  clearError: () => void
  fire: () => Promise<void>
}

export function useBatchSelectAction<TRow extends { id: string }>({
  rows,
  isEligible,
  performAction,
  onOptimisticUpdate,
}: UseBatchSelectActionArgs<TRow>): UseBatchSelectActionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isFiring, setIsFiring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setSelected = useCallback((ids: Set<string>) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Eligibility = persisted server row that passes the caller's predicate.
  // Computed each render against the latest `rows` snapshot so a row that
  // drifted state since the user clicked it (e.g., another tab finalised
  // it) is automatically excluded.
  const eligibleSelectedIds = useMemo(() => {
    const rowsById = new Map(rows.map((row) => [row.id, row]))
    return Array.from(selectedIds).filter((id) => {
      const row = rowsById.get(id)
      if (!row) return false
      return isEligible(row)
    })
  }, [rows, selectedIds, isEligible])

  const fire = useCallback(async () => {
    if (eligibleSelectedIds.length === 0) return
    setIsFiring(true)
    setError(null)
    try {
      const ids = [...eligibleSelectedIds]
      await performAction(ids)
      onOptimisticUpdate?.(ids)
      setSelectedIds(new Set())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed")
    } finally {
      setIsFiring(false)
    }
  }, [eligibleSelectedIds, performAction, onOptimisticUpdate])

  return {
    selectedIds,
    eligibleSelectedIds,
    isFiring,
    error,
    toggleSelected,
    setSelected,
    clearSelection,
    clearError,
    fire,
  }
}
