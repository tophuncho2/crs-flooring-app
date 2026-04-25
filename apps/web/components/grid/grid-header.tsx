"use client"

import type { GridColumn } from "./contracts/grid-column"
import type { ResolvedScrollContract } from "./contracts/grid-scroll"

const ALIGN_CLASS_NAME = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value / 16}rem` : value
}

export type GridHeaderProps<TRow> = {
  columns: ReadonlyArray<GridColumn<TRow>>
  scroll: ResolvedScrollContract
  className?: string
}

/**
 * Header row for the universal Grid. No-wrap headers by default; sticky-top
 * if the resolved scroll contract requests it. Uses CSS flex with per-column
 * minWidth + grow to mirror the body row layout.
 */
export function GridHeader<TRow>({ columns, scroll, className }: GridHeaderProps<TRow>) {
  return (
    <div
      className={joinClassNames(
        "flex border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10",
        scroll.headerSticky ? "sticky top-0 z-10" : undefined,
        className,
      )}
    >
      {columns.map((column) => {
        const minWidth = toCssLength(column.minWidth)
        const preferredWidth = column.preferredWidth ? toCssLength(column.preferredWidth) : minWidth
        const grow = column.grow ?? 0
        const align = column.align ?? "start"
        return (
          <div
            key={column.key}
            style={{
              flexGrow: grow,
              flexBasis: preferredWidth,
              minWidth,
            }}
            className={joinClassNames(
              "flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
              ALIGN_CLASS_NAME[align],
              scroll.noWrapHeaders ? "whitespace-nowrap" : undefined,
            )}
          >
            {column.label}
          </div>
        )
      })}
    </div>
  )
}
