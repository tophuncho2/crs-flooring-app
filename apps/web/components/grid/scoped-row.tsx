"use client"

import { useMemo, type ReactNode } from "react"
import type { GridColumn } from "./contracts/grid-column"
import type { GridControlColumn } from "./contracts/grid-control-column"
import type { GridLayout } from "./contracts/grid-layout"
import type { GridRow, GridRowTone } from "./contracts/grid-row"
import { buildGridTemplateColumns } from "./internals/build-grid-template"

const ALIGN_CLASS_NAME = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
} as const

const ROW_TONE_CLASS_NAME: Record<GridRowTone, string> = {
  default: "bg-[var(--panel-background)]",
  muted: "bg-[var(--panel-border)]/15",
  success: "bg-emerald-500/[0.08]",
  warning: "bg-amber-500/[0.08]",
  error: "bg-rose-500/[0.06]",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ScopedRowProps<TChild extends GridRow> = {
  /** The child row to render. */
  row: TChild
  /** Child layout — distinct from the parent grid's layout. */
  layout: GridLayout<TChild>
  /** Visual tint for the child row. Default `"muted"` so children read as nested. */
  tone?: GridRowTone
  /** Override the default per-data-cell renderer. */
  renderCell?: (column: GridColumn<TChild>, row: TChild) => ReactNode
  /** Renderer for control-column cells. */
  renderControl?: (control: GridControlColumn, row: TChild) => ReactNode
  className?: string
}

/**
 * Child-scoped row primitive. Renders one child row using its own
 * `GridLayout<TChild>` — the child's column shape can differ entirely from
 * the parent grid's columns.
 *
 * Consumers render parent rows via `Grid` and interleave `ScopedRow` blocks
 * inside the parent grid via `<Fragment>`. The grid contract does not require
 * children to share the parent's column shape.
 *
 * Pattern (warehouse precedent):
 *   <Grid layout={parentLayout} renderRow={(parent) => (
 *     <Fragment>
 *       <GridBodyRow row={parent} ... />
 *       {parent.expanded && parent.children.map((child) => (
 *         <ScopedRow row={child} layout={childLayout} key={child.id} />
 *       ))}
 *     </Fragment>
 *   )} />
 */
export function ScopedRow<TChild extends GridRow>({
  row,
  layout,
  tone = "muted",
  renderCell,
  renderControl,
  className,
}: ScopedRowProps<TChild>) {
  const templateColumns = useMemo(() => buildGridTemplateColumns(layout), [layout])

  return (
    <div
      style={{ gridTemplateColumns: templateColumns }}
      className={joinClassNames(
        "grid border-b border-[var(--panel-border)]",
        ROW_TONE_CLASS_NAME[tone],
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
