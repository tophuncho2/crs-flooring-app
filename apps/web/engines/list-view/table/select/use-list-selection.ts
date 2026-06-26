"use client"

import { useCallback, useMemo, useState } from "react"

/**
 * Reusable row-selection state for list views — owns the `Set<string>` of
 * selected row ids and the toggle primitives, nothing else. Deliberately never
 * sees the rows: the consumer hands `toggleAll` the page-eligible ids it is
 * rendering, so the hook stays table-agnostic and the same instance can drive a
 * `DataTable` today and the work-order print picker later. Pairs with the
 * engine's `DataTableSelection` contract — the consumer maps these fields onto
 * it. The selected ids persist across page changes (plain state); wire `clear()`
 * to filter/sort changes so a stale id from a prior scope can't leak into an export.
 */
export type ListSelection = {
  /** Currently-selected row ids (stable reference until a mutation). */
  selectedIds: Set<string>
  selectedCount: number
  isSelected: (id: string) => boolean
  /** Toggle one row in/out of the selection. */
  toggle: (id: string) => void
  /**
   * Toggle the supplied page of eligible ids: if every one is already selected,
   * remove them; otherwise add them all. Operates only on the ids handed in.
   */
  toggleAll: (pageEligibleIds: ReadonlyArray<string>) => void
  /** Drop the entire selection. */
  clear: () => void
}

export function useListSelection(): ListSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((pageEligibleIds: ReadonlyArray<string>) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected =
        pageEligibleIds.length > 0 && pageEligibleIds.every((id) => next.has(id))
      for (const id of pageEligibleIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()))
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      isSelected,
      toggle,
      toggleAll,
      clear,
    }),
    [selectedIds, isSelected, toggle, toggleAll, clear],
  )
}
