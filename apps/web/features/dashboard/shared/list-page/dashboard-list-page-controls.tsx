"use client"

import type { ReactNode } from "react"
import TableControlsBar from "@/features/dashboard/shared/table/table-controls-bar"
import { TableActionsSummary } from "@/features/dashboard/shared/table/table-shell"

export function DashboardListPageControls({
  count,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  isAscendingSort,
  onToggleSort,
  ascendingSortLabel,
  descendingSortLabel,
  filtersSlot,
  columnSettingsSlot,
  secondaryActions,
  primaryAction,
  className,
}: {
  count: number
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchPlaceholder: string
  isAscendingSort: boolean
  onToggleSort: () => void
  ascendingSortLabel?: string
  descendingSortLabel?: string
  filtersSlot?: ReactNode
  columnSettingsSlot?: ReactNode
  secondaryActions?: ReactNode
  primaryAction?: ReactNode
  className?: string
}) {
  return (
    <TableActionsSummary count={count} className={className}>
      <TableControlsBar
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        searchPlaceholder={searchPlaceholder}
        isAscendingSort={isAscendingSort}
        onToggleSort={onToggleSort}
        ascendingSortLabel={ascendingSortLabel}
        descendingSortLabel={descendingSortLabel}
      >
        {filtersSlot}
        {columnSettingsSlot}
        {secondaryActions}
        {primaryAction}
      </TableControlsBar>
    </TableActionsSummary>
  )
}
