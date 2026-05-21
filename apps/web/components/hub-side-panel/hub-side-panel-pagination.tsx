"use client"

export type HubSidePanelPaginationProps = {
  page: number
  totalPages: number
  total: number
  /** Label suffix for the totals readout, e.g. "properties" → "5 properties". */
  totalLabel: string
  canPrev: boolean
  canNext: boolean
  onGoPrev: () => void
  onGoNext: () => void
}

const NAV_BUTTON_CLASS_NAME =
  "rounded border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"

/**
 * Prev / page indicator / next row for paginated lists inside hub-panel
 * sticky headers. Pure presentation — consumers pass query controller state.
 */
export function HubSidePanelPagination({
  page,
  totalPages,
  total,
  totalLabel,
  canPrev,
  canNext,
  onGoPrev,
  onGoNext,
}: HubSidePanelPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
      <span className="tabular-nums text-xs text-[var(--foreground)]/55">
        Page {page} of {totalPages} · {total} {totalLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onGoPrev}
          disabled={!canPrev}
          className={NAV_BUTTON_CLASS_NAME}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onGoNext}
          disabled={!canNext}
          className={NAV_BUTTON_CLASS_NAME}
        >
          Next
        </button>
      </div>
    </div>
  )
}
