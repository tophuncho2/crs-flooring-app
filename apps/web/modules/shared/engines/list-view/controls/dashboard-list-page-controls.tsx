"use client"

import { type ReactNode, useEffect, useRef } from "react"
import TableControlsBar from "@/modules/shared/engines/list-view/table/table-controls-bar"
import { TableActionsSummary } from "@/modules/shared/engines/list-view/table/table-shell"
import type { ListViewEngineState } from "../controllers/use-list-view-engine"

export function DashboardListPageControls({
  engine,
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
  formSlot,
  notice,
  onNoticeDismiss,
  className,
}: {
  engine?: ListViewEngineState<unknown>
  count?: number
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  searchPlaceholder?: string
  isAscendingSort?: boolean
  onToggleSort?: () => void
  ascendingSortLabel?: string
  descendingSortLabel?: string
  filtersSlot?: ReactNode
  columnSettingsSlot?: ReactNode
  secondaryActions?: ReactNode
  primaryAction?: ReactNode
  formSlot?: ReactNode
  notice?: { type: "error" | "success"; message: string } | null
  onNoticeDismiss?: () => void
  className?: string
}) {
  // When engine is provided, it wins over individual props
  const resolvedCount = engine ? engine.processedRows.length : (count ?? 0)
  const resolvedSearchQuery = engine ? engine.searchQuery : (searchQuery ?? "")
  const resolvedOnSearchQueryChange = engine ? engine.onSearchQueryChange : onSearchQueryChange
  const resolvedIsAscendingSort = engine
    ? (engine.sortStack[0]?.direction ?? "asc") === "asc"
    : (isAscendingSort ?? true)
  const resolvedOnToggleSort = engine
    ? () => {
        const currentDirection = engine.sortStack[0]?.direction ?? "asc"
        const nextDirection = currentDirection === "asc" ? "desc" : "asc"
        const nextStack = engine.sortStack.length > 0
          ? [{ ...engine.sortStack[0], direction: nextDirection as "asc" | "desc" }]
          : [{ field: "default", direction: nextDirection as "asc" | "desc" }]
        engine.onSortChange(nextStack)
      }
    : onToggleSort
  const resolvedNotice = engine ? engine.notice : (notice ?? null)
  const resolvedOnNoticeDismiss = engine ? engine.clearNotice : onNoticeDismiss
  const resolvedPrimaryAction = formSlot ?? primaryAction

  return (
    <div>
      <TableActionsSummary count={resolvedCount} className={className}>
        <TableControlsBar
          searchQuery={resolvedSearchQuery}
          onSearchQueryChange={resolvedOnSearchQueryChange ?? (() => {})}
          searchPlaceholder={searchPlaceholder ?? "Search..."}
          isAscendingSort={resolvedIsAscendingSort}
          onToggleSort={resolvedOnToggleSort ?? (() => {})}
          ascendingSortLabel={ascendingSortLabel}
          descendingSortLabel={descendingSortLabel}
        >
          {filtersSlot}
          {columnSettingsSlot}
          {secondaryActions}
          {resolvedPrimaryAction}
        </TableControlsBar>
      </TableActionsSummary>
      {resolvedNotice ? (
        <NoticeStrip
          notice={resolvedNotice}
          onDismiss={resolvedOnNoticeDismiss}
        />
      ) : null}
    </div>
  )
}

function NoticeStrip({
  notice,
  onDismiss,
}: {
  notice: { type: "error" | "success"; message: string }
  onDismiss?: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (notice.type === "success" && onDismiss) {
      timerRef.current = setTimeout(() => {
        onDismiss()
      }, 5000)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [notice, onDismiss])

  const bgClass = notice.type === "error"
    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"

  return (
    <div
      role="status"
      className={`flex w-full items-center justify-between rounded-lg border px-4 py-2 text-sm ${bgClass}`}
    >
      <span>{notice.message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 text-current opacity-70 hover:opacity-100"
          aria-label="Dismiss notice"
        >
          &times;
        </button>
      ) : null}
    </div>
  )
}
