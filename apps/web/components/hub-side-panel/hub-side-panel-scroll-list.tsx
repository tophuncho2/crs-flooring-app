"use client"

import { useCallback, type ReactNode } from "react"

const LOAD_MORE_SCROLL_THRESHOLD_PX = 80

const GRID_BORDER = "border-blue-500/40"
const EMPTY_CELL = "—"

export type HubSidePanelScrollListProps = {
  title: string
  /**
   * Optional count rendered in the tab as `{title} ({count})`. Omit (or pass
   * null) to render the bare title — used when the count is surfaced elsewhere
   * (e.g. the properties count now lives in the MC section).
   */
  count?: number | null
  emptyMessage?: string
  isError?: boolean
  errorMessage?: string
  loadingMessage?: string
  /** False before the first page resolves — renders the loading/error stub. */
  hasData: boolean
  /** True when the resolved list has zero rows — renders the empty cell. */
  isEmpty: boolean
  /** Server reported another page is available. */
  hasMore: boolean
  /** A subsequent page is in flight — renders the "Loading more…" footer. */
  isFetchingMore: boolean
  /** Idempotent; safe to wire to scroll-bottom detection that fires repeatedly. */
  onLoadMore: () => void
  children: ReactNode
}

/**
 * Infinite-scroll sibling of {@link HubSidePanelScopedList}. Same card-with-tab
 * chrome, but the bordered body is a bounded scroll region that fills the
 * panel body height and fetches the next page when scrolled near the bottom —
 * mirroring the hub-side-panel picker's load-more mechanics. The consumer
 * renders {@link HubSidePanelScopedRow} children inside.
 *
 * Pure UI: the consumer owns the paging controller and passes `rows` (as
 * children) plus `hasMore` / `isFetchingMore` / `onLoadMore`.
 */
export function HubSidePanelScrollList({
  title,
  count,
  emptyMessage = EMPTY_CELL,
  isError,
  errorMessage = "Could not load.",
  loadingMessage = "Loading…",
  hasData,
  isEmpty,
  hasMore,
  isFetchingMore,
  onLoadMore,
  children,
}: HubSidePanelScrollListProps) {
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isFetchingMore) return
      const target = event.currentTarget
      const distanceFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceFromBottom <= LOAD_MORE_SCROLL_THRESHOLD_PX) {
        onLoadMore()
      }
    },
    [hasMore, isFetchingMore, onLoadMore],
  )

  if (!hasData) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          {title}
        </div>
        <p className="text-xs text-[var(--foreground)]/55">
          {isError ? errorMessage : loadingMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <span
          className={`inline-block rounded-t-md border border-b-0 ${GRID_BORDER} bg-blue-500/15 px-3 py-1 text-xs font-bold text-[var(--foreground)]/85`}
        >
          {count === null || count === undefined ? title : `${title} (${count})`}
        </span>
      </div>
      <div
        onScroll={handleScroll}
        className={`min-h-0 flex-1 overflow-y-auto rounded-md rounded-tl-none border ${GRID_BORDER}`}
      >
        {isEmpty ? (
          <div className="px-3 py-2 text-xs text-[var(--foreground)]/55">{emptyMessage}</div>
        ) : (
          <>
            {children}
            {isFetchingMore ? (
              <div className="px-3 py-3 text-center text-xs text-[var(--foreground)]/55">
                Loading more…
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
