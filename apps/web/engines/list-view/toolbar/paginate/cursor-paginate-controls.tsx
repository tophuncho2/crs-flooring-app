"use client"

import type { CursorPaginateContract } from "./contracts/paginate-contract"

const BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"

export type CursorPaginateControlsProps = CursorPaginateContract & {
  className?: string
}

/**
 * Visual prev / next pager for cursor lists with no total count (see
 * {@link CursorPaginateContract}). Always renders both buttons — Previous is
 * disabled on the first page, Next when the payload reports no further rows —
 * so the pager is visible from page one rather than appearing only once a
 * second page exists. The counted sibling is {@link PaginateControls}.
 */
export function CursorPaginateControls({
  page,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  className,
}: CursorPaginateControlsProps) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--foreground)]/75",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="tabular-nums">Page {page}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          className={BUTTON_CLASS_NAME}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={!hasNextPage}
          className={BUTTON_CLASS_NAME}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
