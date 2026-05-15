"use client"

import type { ReactNode } from "react"
import type { DataTableCellAlign, DataTableColumn } from "./contracts/data-table-column"
import type { DataTableRow } from "./contracts/data-table-row"

const ALIGN_CLASS_NAME: Record<DataTableCellAlign, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type DataTableProps<TRow extends DataTableRow> = {
  rows: ReadonlyArray<TRow>
  columns: ReadonlyArray<DataTableColumn<TRow>>
  /** Rendered inside a full-width row when `rows` is empty. */
  empty?: ReactNode
  /** Slot rendered above the table — typically toolbar content. */
  headerSlot?: ReactNode
  /** Slot rendered below the table — typically pagination controls. */
  footerSlot?: ReactNode
  /** Per-cell renderer. Defaults to `column.render?.(row)` or
   *  `row[column.key]` as plain text. */
  renderCell?: (column: DataTableColumn<TRow>, row: TRow) => ReactNode
  /** Optional per-row click handler. When set, rows render as
   *  interactive (`role="button"`, Enter/Space activation, hover +
   *  focus styling). */
  onRowClick?: (row: TRow) => void
  /** Aria-label provider for interactive rows. */
  getRowAriaLabel?: (row: TRow) => string
  className?: string
}

/**
 * Universal data table primitive. Renders a native `<table>` with
 * `table-layout: auto` so each column track sizes to
 * `max(header label, widest cell)` and never wraps. Wraps the table in
 * an `overflow-x-auto` scroller for horizontal scroll when total
 * content exceeds the container width.
 *
 * Replaces the CSS Grid–based `<Grid>` for list-view tables. The Grid
 * stays in place for record-view sub-grids and other non-tabular
 * compositions.
 */
export function DataTable<TRow extends DataTableRow>({
  rows,
  columns,
  empty,
  headerSlot,
  footerSlot,
  renderCell,
  onRowClick,
  getRowAriaLabel,
  className,
}: DataTableProps<TRow>) {
  const interactive = Boolean(onRowClick)

  return (
    <div
      className={joinClassNames(
        "overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      {headerSlot ? (
        <div className="border-b border-[var(--panel-border)] px-3 py-2">{headerSlot}</div>
      ) : null}
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={joinClassNames(
                    "whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
                    ALIGN_CLASS_NAME[column.align ?? "start"],
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-sm text-[var(--foreground)]/60"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? getRowAriaLabel?.(row) : undefined}
                  onClick={interactive ? () => onRowClick?.(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onRowClick?.(row)
                          }
                        }
                      : undefined
                  }
                  className={joinClassNames(
                    "border-b border-[var(--panel-border)] bg-[var(--panel-background)]",
                    interactive
                      ? "cursor-pointer transition hover:bg-sky-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                      : undefined,
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={joinClassNames(
                        "whitespace-nowrap px-3 py-2 text-sm text-[var(--foreground)]",
                        ALIGN_CLASS_NAME[column.align ?? "start"],
                      )}
                    >
                      {renderCell
                        ? renderCell(column, row)
                        : column.render
                          ? column.render(row)
                          : renderDefaultCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footerSlot ? (
        <div className="border-t border-[var(--panel-border)] px-3 py-2">{footerSlot}</div>
      ) : null}
    </div>
  )
}

function renderDefaultCell<TRow>(column: DataTableColumn<TRow>, row: TRow): ReactNode {
  const value = (row as Record<string, unknown>)[column.key]
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}
