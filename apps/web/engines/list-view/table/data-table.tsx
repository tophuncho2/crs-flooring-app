"use client"

import type { ReactNode } from "react"
import type { DataTableCellAlign, DataTableColumn } from "./contracts/data-table-column"
import type { DataTableRow } from "./contracts/data-table-row"
import { DataTableSelectAllButton, DataTableSelectCheckbox } from "./select"

const ALIGN_CLASS_NAME: Record<DataTableCellAlign, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
}

const DEFAULT_SELECTION_WIDTH = 44

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Optional multi-select feature for the `DataTable`. When supplied, the table
 * prepends a fixed-width checkbox column, renders a "Select All Eligible /
 * Clear" toggle in the header, highlights selected rows, and toggles a row's
 * membership on row-click. The consumer owns the selection state (a
 * `Set<string>` of row ids) and the toggle handlers. Off by default — tables
 * without this prop behave exactly as before.
 */
export type DataTableSelection<TRow extends DataTableRow> = {
  /** Currently-selected row ids. */
  selectedIds: Set<string>
  /** Toggle one row's membership in the selection. */
  onToggleRow: (id: string) => void
  /** Select-all chrome (wire straight from the selection controller). */
  isSelectionActive: boolean
  selectedCount: number
  eligibleCount: number
  onToggleAll: () => void
  /** Gate toggling (e.g. section saving). When false, checkboxes render static
   *  and the Select-All button is disabled in its inactive state. Default true. */
  canToggleSelection?: boolean
  /** Per-row eligibility — ineligible rows render an inert checkbox and can't be
   *  toggled. Default: every row selectable. */
  isRowSelectable?: (row: TRow) => boolean
  /** Selection column width (px or CSS length). Default 44. */
  selectionWidth?: number | string
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
   *  focus styling). Ignored when `selection` is set (row-click toggles
   *  selection instead). */
  onRowClick?: (row: TRow) => void
  /** Optional multi-select feature — see {@link DataTableSelection}. */
  selection?: DataTableSelection<TRow>
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
  selection,
  getRowAriaLabel,
  className,
}: DataTableProps<TRow>) {
  const canToggleSelection = selection ? selection.canToggleSelection ?? true : false
  const isRowSelectable = (row: TRow) =>
    selection?.isRowSelectable ? selection.isRowSelectable(row) : true
  const activateRow = selection
    ? (row: TRow) => {
        if (canToggleSelection && isRowSelectable(row)) selection.onToggleRow(row.id)
      }
    : onRowClick
  const interactive = Boolean(activateRow)
  const totalColumns = columns.length + (selection ? 1 : 0)

  return (
    <div
      className={joinClassNames(
        "overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      {headerSlot || selection ? (
        <div className="border-b border-[var(--panel-border)] px-3 py-2">
          {selection ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-1 flex-wrap items-center gap-2">{headerSlot}</div>
              <DataTableSelectAllButton
                isSelectionActive={selection.isSelectionActive}
                selectedCount={selection.selectedCount}
                eligibleCount={selection.eligibleCount}
                canSelect={canToggleSelection}
                onToggle={selection.onToggleAll}
              />
            </div>
          ) : (
            headerSlot
          )}
        </div>
      ) : null}
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10">
              {selection ? (
                <th
                  scope="col"
                  style={{ width: selection.selectionWidth ?? DEFAULT_SELECTION_WIDTH }}
                  className="px-3 py-2"
                >
                  <span className="sr-only">Select</span>
                </th>
              ) : null}
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
                  colSpan={totalColumns}
                  className="px-3 py-12 text-center text-sm text-[var(--foreground)]/60"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selection?.selectedIds.has(row.id) ?? false
                return (
                <tr
                  key={row.id}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? getRowAriaLabel?.(row) : undefined}
                  aria-pressed={selection ? selected : undefined}
                  onClick={interactive ? () => activateRow?.(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            activateRow?.(row)
                          }
                        }
                      : undefined
                  }
                  className={joinClassNames(
                    "border-b border-[var(--panel-border)]",
                    selected ? "bg-sky-500/[0.08]" : "bg-[var(--panel-background)]",
                    interactive
                      ? "cursor-pointer transition hover:bg-sky-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                      : undefined,
                  )}
                >
                  {selection ? (
                    <td
                      className="px-3 py-2 text-center"
                      // Stop the checkbox's click from bubbling to the row's
                      // toggle — without this the row handler toggles a second
                      // time and cancels the checkbox's own toggle.
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <DataTableSelectCheckbox
                        checked={selected}
                        editable={canToggleSelection && isRowSelectable(row)}
                        onChange={() => selection.onToggleRow(row.id)}
                        ariaLabel={getRowAriaLabel?.(row) ?? `Select ${row.id}`}
                      />
                    </td>
                  ) : null}
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
                )
              })
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
