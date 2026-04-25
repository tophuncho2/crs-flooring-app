"use client"

import type { ReactNode } from "react"
import type { GridColumn } from "./contracts/grid-column"
import type { GridRow, GridRowTone } from "./contracts/grid-row"
import type { ResolvedScrollContract } from "./contracts/grid-scroll"

const ALIGN_CLASS_NAME = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const

const ROW_TONE_CLASS_NAME: Record<GridRowTone, string> = {
  default: "bg-[var(--panel-background)]",
  muted: "bg-[var(--panel-border)]/10",
  success: "bg-emerald-500/[0.06]",
  warning: "bg-amber-500/[0.06]",
  error: "bg-rose-500/[0.06]",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value / 16}rem` : value
}

export type GridRowProps<TRow extends GridRow> = {
  row: TRow
  columns: ReadonlyArray<GridColumn<TRow>>
  scroll: ResolvedScrollContract
  /**
   * Optional override for cell rendering. Default delegates to
   * `column.render(row)`; if no `render` is set, renders the row's value at
   * `column.key` as plain text.
   */
  renderCell?: (column: GridColumn<TRow>, row: TRow) => ReactNode
  className?: string
}

export function GridBodyRow<TRow extends GridRow>({
  row,
  columns,
  scroll,
  renderCell,
  className,
}: GridRowProps<TRow>) {
  const tone = row.tone ?? "default"

  return (
    <div
      className={joinClassNames(
        "flex border-b border-[var(--panel-border)]",
        ROW_TONE_CLASS_NAME[tone],
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
              "flex items-center px-3 py-2 text-sm text-[var(--foreground)]",
              ALIGN_CLASS_NAME[align],
              scroll.growToFitText ? undefined : "truncate",
            )}
          >
            {renderCell
              ? renderCell(column, row)
              : column.render
                ? column.render(row)
                : renderDefaultCell(column, row)}
          </div>
        )
      })}
    </div>
  )
}

function renderDefaultCell<TRow>(column: GridColumn<TRow>, row: TRow): ReactNode {
  const value = (row as Record<string, unknown>)[column.key]
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}
