"use client"

import type { GridLayout } from "./contracts/grid-layout"
import type { GridRow } from "./contracts/grid-row"
import type { ResolvedScrollContract } from "./contracts/grid-scroll"

const ALIGN_CLASS_NAME = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type GridHeaderProps<TRow extends GridRow> = {
  layout: GridLayout<TRow>
  scroll: ResolvedScrollContract
  /** Pre-computed `grid-template-columns` value shared with the body rows. */
  templateColumns: string
  className?: string
}

/**
 * Header row for the universal Grid. CSS Grid layout — uses the same
 * `grid-template-columns` template the body rows use so column edges align.
 * Renders leading control headers, data column labels, and trailing control
 * headers in template order.
 */
export function GridHeader<TRow extends GridRow>({
  layout,
  scroll,
  templateColumns,
  className,
}: GridHeaderProps<TRow>) {
  return (
    <div
      style={{ gridTemplateColumns: templateColumns }}
      className={joinClassNames(
        "grid border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10",
        scroll.headerSticky ? "sticky top-0 z-10" : undefined,
        className,
      )}
    >
      {layout.leadingControls?.map((control) => {
        const align = control.align ?? "center"
        return (
          <div
            key={control.key}
            className={joinClassNames(
              "flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
              ALIGN_CLASS_NAME[align],
              scroll.noWrapHeaders ? "whitespace-nowrap" : undefined,
            )}
          >
            {control.label ?? ""}
          </div>
        )
      })}
      {layout.dataColumns.map((column) => {
        const align = column.align ?? "start"
        return (
          <div
            key={column.key}
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
      {layout.trailingControls?.map((control) => {
        const align = control.align ?? "center"
        return (
          <div
            key={control.key}
            className={joinClassNames(
              "flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
              ALIGN_CLASS_NAME[align],
              scroll.noWrapHeaders ? "whitespace-nowrap" : undefined,
            )}
          >
            {control.label ?? ""}
          </div>
        )
      })}
    </div>
  )
}
