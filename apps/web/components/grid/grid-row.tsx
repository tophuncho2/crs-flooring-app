"use client"

import type { ReactNode } from "react"
import type { GridColumn } from "./contracts/grid-column"
import type { GridControlColumn } from "./contracts/grid-control-column"
import type { GridLayout } from "./contracts/grid-layout"
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

export type GridRowProps<TRow extends GridRow> = {
  row: TRow
  layout: GridLayout<TRow>
  scroll: ResolvedScrollContract
  /** Pre-computed `grid-template-columns` value shared with the header. */
  templateColumns: string
  /**
   * Optional override for data-cell rendering. Default delegates to
   * `column.render(row)`; if no `render` is set, renders the row's value at
   * `column.key` as plain text.
   */
  renderCell?: (column: GridColumn<TRow>, row: TRow) => ReactNode
  /**
   * Renderer for control-column cells. Required when the layout has any
   * leading or trailing controls — without it those cells render empty.
   */
  renderControl?: (control: GridControlColumn, row: TRow) => ReactNode
  /**
   * Optional row-level click handler. When set, the row renders as an
   * interactive element (`role="button"`, keyboard-activatable via Enter /
   * Space, hover + focus styling).
   */
  onClick?: () => void
  /** Aria-label for the row when `onClick` is set. */
  ariaLabel?: string
  className?: string
}

export function GridBodyRow<TRow extends GridRow>({
  row,
  layout,
  scroll,
  templateColumns,
  renderCell,
  renderControl,
  onClick,
  ariaLabel,
  className,
}: GridRowProps<TRow>) {
  const tone = row.tone ?? "default"
  const interactive = Boolean(onClick)

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      style={{ gridTemplateColumns: templateColumns }}
      className={joinClassNames(
        "grid border-b border-[var(--panel-border)]",
        ROW_TONE_CLASS_NAME[tone],
        interactive
          ? "cursor-pointer transition hover:bg-sky-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          : undefined,
        className,
      )}
    >
      {layout.leadingControls?.map((control) => {
        const align = control.align ?? "center"
        return (
          <div
            key={control.key}
            className={joinClassNames(
              "flex items-center px-3 py-2 text-sm text-[var(--foreground)]",
              ALIGN_CLASS_NAME[align],
            )}
          >
            {renderControl ? renderControl(control, row) : null}
          </div>
        )
      })}
      {layout.dataColumns.map((column) => {
        const align = column.align ?? "start"
        return (
          <div
            key={column.key}
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
      {layout.trailingControls?.map((control) => {
        const align = control.align ?? "center"
        return (
          <div
            key={control.key}
            className={joinClassNames(
              "flex items-center px-3 py-2 text-sm text-[var(--foreground)]",
              ALIGN_CLASS_NAME[align],
            )}
          >
            {renderControl ? renderControl(control, row) : null}
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
