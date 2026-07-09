"use client"

import type { ReactNode } from "react"
import type { PaginateContract } from "./contracts/paginate-contract"

const BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"

export type PaginateControlsProps = PaginateContract & {
  className?: string
  /** Optional content rendered on the LEFT, before the page counter (e.g. the
   *  pinned footer's column rollups). Keeps the prev/next cluster on the right. */
  leading?: ReactNode
}

/**
 * Visual prev / next + page counter. Renders as `<a>` links when href props
 * are supplied; falls back to `<button>` with `onPreviousPage` / `onNextPage`
 * callbacks otherwise.
 */
export function PaginateControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousPageHref,
  nextPageHref,
  className,
  leading,
}: PaginateControlsProps) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-4 px-3 py-2 text-sm text-[var(--foreground)]/75",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{leading}</div>
      <div className="flex items-center gap-4">
        <div className="tabular-nums">
          Page {page} of {Math.max(totalPages, 1)} · {totalItems} items
          {pageSize ? ` · ${pageSize}/page` : ""}
        </div>
        <div className="flex items-center gap-2">
          {previousPageHref ? (
            <a
              href={hasPreviousPage ? previousPageHref : undefined}
              aria-disabled={!hasPreviousPage || undefined}
              className={BUTTON_CLASS_NAME}
            >
              ← Previous
            </a>
          ) : (
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={!hasPreviousPage || !onPreviousPage}
              className={BUTTON_CLASS_NAME}
            >
              ← Previous
            </button>
          )}
          {nextPageHref ? (
            <a
              href={hasNextPage ? nextPageHref : undefined}
              aria-disabled={!hasNextPage || undefined}
              className={BUTTON_CLASS_NAME}
            >
              Next →
            </a>
          ) : (
            <button
              type="button"
              onClick={onNextPage}
              disabled={!hasNextPage || !onNextPage}
              className={BUTTON_CLASS_NAME}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
