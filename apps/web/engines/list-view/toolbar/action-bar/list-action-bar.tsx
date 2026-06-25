"use client"

import type { ReactNode } from "react"
import { ClearAllFiltersButton } from "../filter/clear-all-filters-button"
import { ListRowCount } from "../list-toolbar/list-row-count"

export type ListActionBarProps = {
  /** Module label shown in the top-left blue tag (e.g. "Job Types"). */
  label: string
  /** Rows currently shown. */
  rowCount: number
  /** Total matching rows. */
  total: number
  /** Plural noun for the count (e.g. "job types"). */
  rowCountLabel: string
  /** Whether any search/filter is active (drives the Clear-all button). */
  hasActiveFilters: boolean
  /** Clears all search + filters. */
  onClearAll: () => void
  /** Right-anchored tool buttons (Sort → Filter → Search, left-to-right). */
  children?: ReactNode
}

/**
 * Right-anchored list header bar — the caged replacement for the old vertical
 * toolbar card. Left group: the module label (clean top-left tag, no seam) plus
 * the row count and Clear-all. Right group: the tool menu buttons. The data
 * table sits directly beneath, shifted up into the space the old card freed.
 *
 * Future Sort drops in as another {@link ToolbarMenuButton} child — the bar
 * itself needs no change.
 */
export function ListActionBar({
  label,
  rowCount,
  total,
  rowCountLabel,
  hasActiveFilters,
  onClearAll,
  children,
}: ListActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
      <div className="flex items-center gap-3">
        <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
          {label}
        </span>
        <ListRowCount count={rowCount} total={total} label={rowCountLabel} />
        <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={onClearAll} />
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
