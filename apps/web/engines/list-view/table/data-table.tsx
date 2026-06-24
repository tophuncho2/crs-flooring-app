"use client"

import type { ReactNode } from "react"
import { RecordOpenButton } from "@/engines/common"
import type {
  CursorPaginateContract,
  PaginateContract,
} from "../toolbar/paginate/contracts/paginate-contract"
import { CursorPaginateControls } from "../toolbar/paginate/cursor-paginate-controls"
import { PaginateControls } from "../toolbar/paginate/paginate-controls"
import type { DataTableCellAlign, DataTableColumn } from "./contracts/data-table-column"
import type { DataTableRow } from "./contracts/data-table-row"
import { DataTableHeaderCell, type DataTableColumnFilter } from "./data-table-header-cell"
import { TableOptions, type TableOptionsConfig } from "./options"
import { DataTableSelectAllButton, DataTableSelectCheckbox } from "./select"

const ALIGN_CLASS_NAME: Record<DataTableCellAlign, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
}

const DEFAULT_SELECTION_WIDTH = 44
// Leading "open" gutter width. Sized for one launch button; when a consumer also
// supplies {@link DataTableProps.rowActions} the gutter hosts a second (options)
// button beside it, so it widens to fit two targets + gap for zero reflow.
const DEFAULT_OPEN_WIDTH = 44
const OPEN_WIDTH_WITH_ACTIONS = 88

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
  /**
   * Canonical pagination. When supplied, the engine renders `PaginateControls`
   * in the footer **itself**, always-on (no `totalPages > 1` gate) — consumers
   * hand the table the contract, not a pre-rendered control, which is what makes
   * a paginated footer a guaranteed property of this surface rather than a
   * per-module choice. Takes precedence over {@link footerSlot}.
   */
  pagination?: PaginateContract
  /**
   * Cursor pagination for `hasMore` lists with no total count. Like
   * {@link pagination}, the engine renders the always-on footer **itself** from
   * the contract — the consumer never hand-renders one — so a cursor footer is
   * a guaranteed property of the surface. Lower precedence than
   * {@link pagination}, higher than {@link footerSlot}.
   */
  cursorPagination?: CursorPaginateContract
  /**
   * Escape-hatch footer for bespoke footer chrome that fits neither
   * {@link pagination} nor {@link cursorPagination}. Ignored when either is set.
   */
  footerSlot?: ReactNode
  /** Per-cell renderer. Defaults to `column.render?.(row)` or
   *  `row[column.key]` as plain text. */
  renderCell?: (column: DataTableColumn<TRow>, row: TRow) => ReactNode
  /**
   * Makes the whole row clickable (`role="button"`, Enter/Space activation, hover
   * + focus styling). Ignored when `selection` is set (row-click toggles selection
   * instead). Reserved for the *select / swap-reference* picker grids; openable
   * record tables use {@link onOpenRow} instead, which renders a dedicated open
   * gutter rather than co-opting the whole row.
   */
  onRowClick?: (row: TRow) => void
  /**
   * Open affordance. When set, the table renders a fixed leading **action gutter**
   * whose launch button opens the row's record; the row body itself stays inert
   * (no row-click). The gutter is a flex row sized to also host a future
   * overflow/options button beside the open button — see {@link DEFAULT_OPEN_WIDTH}.
   * Mutually exclusive with {@link onRowClick} per consumer.
   */
  onOpenRow?: (row: TRow) => void
  /**
   * Optional per-row action(s) rendered in the leading gutter beside the open
   * button (e.g. an overflow/options menu). Pure pass-through `ReactNode` — the
   * consumer owns the control. When set, the gutter renders even without
   * {@link onOpenRow} and widens to host the extra target. The gutter cell stops
   * click propagation so these controls never trip a row handler.
   */
  rowActions?: (row: TRow) => ReactNode
  /** Optional multi-select feature — see {@link DataTableSelection}. */
  selection?: DataTableSelection<TRow>
  /**
   * Active server-side sort. When a column is `sortable` and matches
   * `sort.field`, its header caret reflects the direction; other sortable
   * headers show an idle ⇅. Null/absent → no active sort indicator.
   */
  sort?: { field: string; direction: "asc" | "desc" } | null
  /**
   * Active multi-column sort (highest priority first). When set, it supersedes
   * {@link sort}: a sortable column matching an entry shows its caret, plus a
   * priority badge (1, 2, 3…) when more than one column is active. Single-sort
   * consumers can ignore this and pass {@link sort} alone.
   */
  sorts?: ReadonlyArray<{ field: string; direction: "asc" | "desc" }>
  /**
   * Called with a sortable column's `key` when its header is clicked. The
   * caller owns the field→direction mapping (e.g. flip when already active,
   * else select with a sensible default). Sortable headers are inert without it.
   */
  onSort?: (key: string) => void
  /**
   * Per-column header filters, keyed by `column.key`. A column with an entry
   * grows a funnel affordance in its header that opens an anchored popover
   * hosting the consumer-supplied filter body — see {@link DataTableColumnFilter}.
   * The engine owns the affordance + popover chrome; the consumer owns the body
   * and its state. Absent → no funnel.
   */
  columnFilters?: Record<string, DataTableColumnFilter>
  /**
   * Table-options control rendered in the leading open-gutter header — an icon
   * trigger opening a tabbed popover (today: a "Sort" tab wrapping the multi-column
   * sort builder). Additive/opt-in; setting it force-renders the gutter header so
   * the trigger has a home even when the consumer passes no `onOpenRow`/`rowActions`.
   * See {@link TableOptionsConfig}.
   */
  tableOptions?: TableOptionsConfig
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
  pagination,
  cursorPagination,
  footerSlot,
  renderCell,
  onRowClick,
  onOpenRow,
  rowActions,
  selection,
  sort,
  sorts,
  onSort,
  columnFilters,
  tableOptions,
  getRowAriaLabel,
  className,
}: DataTableProps<TRow>) {
  // The ordered `sorts` list is canonical; a single `sort` is treated as a
  // one-element list so single-sort consumers need no changes.
  const effectiveSorts = sorts ?? (sort ? [sort] : [])
  const canToggleSelection = selection ? selection.canToggleSelection ?? true : false
  const isRowSelectable = (row: TRow) =>
    selection?.isRowSelectable ? selection.isRowSelectable(row) : true
  const activateRow = selection
    ? (row: TRow) => {
        if (canToggleSelection && isRowSelectable(row)) selection.onToggleRow(row.id)
      }
    : onRowClick
  const interactive = Boolean(activateRow)
  const hasRowActions = Boolean(rowActions)
  // `tableOptions` force-renders the gutter header so its trigger has a home even
  // when the consumer renders no per-row open/actions (e.g. the picker grid).
  const hasOpenColumn = Boolean(onOpenRow) || hasRowActions || Boolean(tableOptions)
  const openColumnWidth = hasRowActions ? OPEN_WIDTH_WITH_ACTIONS : DEFAULT_OPEN_WIDTH
  const totalColumns = columns.length + (selection ? 1 : 0) + (hasOpenColumn ? 1 : 0)

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
              {hasOpenColumn ? (
                <th scope="col" style={{ width: openColumnWidth }} className="px-3 py-2">
                  {tableOptions ? (
                    <span className="flex items-center justify-center">
                      <TableOptions config={tableOptions} />
                    </span>
                  ) : (
                    <span className="sr-only">{hasRowActions ? "Actions" : "Open"}</span>
                  )}
                </th>
              ) : null}
              {columns.map((column) => (
                <DataTableHeaderCell<TRow>
                  key={column.key}
                  column={column}
                  sorts={effectiveSorts}
                  onSort={onSort}
                  filter={columnFilters?.[column.key]}
                />
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
                  {hasOpenColumn ? (
                    <td
                      className="px-3 py-2"
                      // Keep gutter-button clicks off any row-level handler.
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {/* Flex gutter — the open button and an optional row-actions
                          control (e.g. an options menu) sit side by side. */}
                      <div className="flex items-center justify-center gap-2">
                        {onOpenRow ? (
                          <RecordOpenButton
                            onClick={() => onOpenRow(row)}
                            ariaLabel={getRowAriaLabel?.(row) ?? `Open ${row.id}`}
                          />
                        ) : null}
                        {rowActions?.(row)}
                      </div>
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
      {pagination ? (
        // PaginateControls owns its own px-3 py-2 padding — no extra here.
        <div className="border-t border-[var(--panel-border)]">
          <PaginateControls {...pagination} />
        </div>
      ) : cursorPagination ? (
        // CursorPaginateControls owns its own px-3 py-2 padding — no extra here.
        <div className="border-t border-[var(--panel-border)]">
          <CursorPaginateControls {...cursorPagination} />
        </div>
      ) : footerSlot ? (
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
