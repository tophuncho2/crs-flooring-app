"use client"

import type { CSSProperties, ReactNode } from "react"
import { useCallback, useRef, useState } from "react"
import { RecordOpenButton } from "@/engines/common"
import type {
  CursorPaginateContract,
  PaginateContract,
} from "../toolbar/paginate/contracts/paginate-contract"
import { CursorPaginateControls } from "../toolbar/paginate/cursor-paginate-controls"
import { PaginateControls } from "../toolbar/paginate/paginate-controls"
import type { DataTableCellAlign, DataTableColumn } from "./contracts/data-table-column"
import type { DataTableRow } from "./contracts/data-table-row"
import { DataTableHeaderCell } from "./data-table-header-cell"
import { ColumnResizeHandle, MIN_COLUMN_WIDTH } from "./resize"
import { DataTableSelectCheckbox } from "./select"

// Clamp for the auto-measured seed width so a runaway content column can't seed
// an absurd initial track. Below the min the seed floors to a legible column.
const MAX_SEED_COLUMN_WIDTH = 480

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
// Fallback track width (px) for an editable data column that declares neither
// `width` nor `minWidth`.
const DEFAULT_EDITABLE_DATA_WIDTH = 80

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value
}

/** Pixel value if `value` is a number, else `null` (CSS-length strings can't be
 *  summed into the table's min-width). */
function toPx(value: number | string | undefined): number | null {
  return typeof value === "number" ? value : null
}

/**
 * Computes the `<colgroup>` tracks + the table's floor width for the editable
 * variant (`table-layout: fixed`). Leading control tracks (selection + gutter)
 * are fixed px; data columns either pin to `width`/`minWidth` or split the
 * leftover width by `grow` weight — the table-model analogue of the Grid's
 * `minmax(preferred, grow·fr)`. The table never shrinks below the summed
 * minimums; the `overflow-x-auto` wrapper scrolls instead.
 */
function buildEditableLayout<TRow>(
  columns: ReadonlyArray<DataTableColumn<TRow>>,
  leadingWidths: number[],
): { cols: Array<{ key: string; style: CSSProperties }>; tableMinWidth: number } {
  const totalGrow = columns.reduce((sum, column) => sum + (column.grow ?? 0), 0)
  // Width reserved by leading tracks + every pinned (non-grow) data column.
  // Grow columns share what's left of `100%` after this reservation.
  const reservedPx =
    leadingWidths.reduce((sum, width) => sum + width, 0) +
    columns.reduce((sum, column) => {
      if ((column.grow ?? 0) > 0) return sum
      return sum + (toPx(column.width) ?? toPx(column.minWidth) ?? DEFAULT_EDITABLE_DATA_WIDTH)
    }, 0)

  const cols = columns.map((column) => {
    const grow = column.grow ?? 0
    if (grow > 0 && totalGrow > 0) {
      const fraction = (grow / totalGrow).toFixed(4)
      return {
        key: column.key,
        style: {
          width: `calc((100% - ${reservedPx}px) * ${fraction})`,
          minWidth: column.minWidth != null ? toCssLength(column.minWidth) : undefined,
        } satisfies CSSProperties,
      }
    }
    return {
      key: column.key,
      style: {
        width: toCssLength(column.width ?? column.minWidth ?? DEFAULT_EDITABLE_DATA_WIDTH),
      } satisfies CSSProperties,
    }
  })

  const tableMinWidth =
    leadingWidths.reduce((sum, width) => sum + width, 0) +
    columns.reduce(
      (sum, column) =>
        sum + (toPx(column.minWidth) ?? toPx(column.width) ?? DEFAULT_EDITABLE_DATA_WIDTH),
      0,
    )

  return { cols, tableMinWidth }
}

/**
 * Optional multi-select feature for the `DataTable`. When supplied, the table
 * prepends a fixed-width checkbox column, highlights selected rows, and toggles
 * a row's membership on row-click. The consumer owns the selection state (a
 * `Set<string>` of row ids) and the toggle handler. Off by default — tables
 * without this prop behave exactly as before. Select-all and selection counts
 * live wherever the consumer surfaces them (e.g. the export menu), NOT in the
 * table chrome.
 */
/**
 * One column rollup shown in the pinned footer (e.g. "Total Stock" → "12,345").
 * The consumer maps the read's `totals` into these; the footer renders them on
 * the left of the pager. Off when absent.
 */
export type DataTableRollup = {
  label: string
  value: string
}

export type DataTableSelection<TRow extends DataTableRow> = {
  /** Currently-selected row ids. */
  selectedIds: Set<string>
  /** Toggle one row's membership in the selection. */
  onToggleRow: (id: string) => void
  /** Gate toggling (e.g. section saving). When false, checkboxes render static.
   *  Default true. */
  canToggleSelection?: boolean
  /** Per-row eligibility — ineligible rows render an inert checkbox and can't be
   *  toggled. Default: every row selectable. */
  isRowSelectable?: (row: TRow) => boolean
  /** Selection column width (px or CSS length). Default 44. */
  selectionWidth?: number | string
  /**
   * Select-all / clear-all for the current page's eligible ids. When provided,
   * the header renders an always-visible select-all checkbox (checked when every
   * eligible row is ticked, indeterminate when only some are). The table computes
   * the page's eligible ids from `rows` + `isRowSelectable` and hands them in.
   */
  onToggleAll?: (pageEligibleIds: string[]) => void
  /** Drop the whole selection — drives the pinned-footer "N selected · Clear"
   *  cluster. When omitted, the footer cluster hides its Clear affordance. */
  onClear?: () => void
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
  /**
   * Pinned-footer column rollups (e.g. inventory stock-balance total). Rendered
   * on the left of the pager, over the FULL filtered set. Off when absent.
   */
  rollups?: ReadonlyArray<DataTableRollup>
  /** Optional multi-select feature — see {@link DataTableSelection}. */
  selection?: DataTableSelection<TRow>
  /** Aria-label provider for interactive rows. */
  getRowAriaLabel?: (row: TRow) => string
  /**
   * Layout variant. `"list"` (default) is the read-only dashboard table:
   * `table-layout: auto`, content-sized columns, `white-space: nowrap` cells —
   * unchanged from before. `"editable"` deploys the table to a record-view
   * section: `table-layout: fixed` with a `<colgroup>` built from the columns'
   * `width`/`minWidth`/`grow` hints, cells that don't wrap-clip so inline
   * editors fill their track, and a single-icon leading gutter (a per-row
   * delete via {@link rowActions}, no open button).
   */
  variant?: "list" | "editable"
  /**
   * Editable variant only: the px width of the leading gutter that hosts
   * {@link rowActions}. Defaults to one icon (44). Widen it when a row carries
   * more than one control (e.g. WO requested-material rows pair a create-
   * adjustment "+" with the delete icon). Ignored by the `list` variant, which
   * sizes its gutter from `onOpenRow`/`rowActions` automatically.
   */
  rowActionsWidth?: number
  /**
   * List-page **fill mode**. When true the card becomes a bounded, full-height
   * flex column: the table body scrolls INSIDE its own `overflow-auto` region
   * (so the `<thead>` sticks to the top of that region, pinning under the app
   * shell's action bar) and the footer (pagination / rollups) is a flex sibling
   * that stays pinned at the bottom. Off (default) keeps the legacy document-
   * flow card with horizontal-only scroll — the shape record-view sections and
   * the `editable` variant rely on. List pages opt in via {@link ListPageShell}
   * `fill`. Ignored by the `editable` variant.
   */
  fill?: boolean
  /**
   * **Flush border mode.** Squares the card's corners and drops the rounding +
   * drop-shadow so the table sits flush against whatever borders it (a
   * record-view section that bleeds to the nav rail / viewport edge). Unlike
   * {@link fill} this is independent of the `editable` variant and does NOT
   * change the height/scroll model — the document-flow `overflow-x-auto`
   * horizontal scroll is preserved. `fill` already squares its own corners, so
   * this only affects the non-fill (document-flow) path.
   */
  flush?: boolean
  /**
   * Adjustable column widths (fill tables only). The table seeds each column's
   * width by measuring its natural (content-fit) width on first paint, then
   * switches to `table-layout: fixed` and renders a drag handle on every header
   * cell's right edge. A trailing spacer column absorbs any slack so widths stay
   * pixel-exact (no proportional scaling) and the rows still span the full card.
   * Uncontrolled by default (session-only internal state); pass
   * {@link columnWidths} + {@link onColumnWidthsChange} to lift the state (e.g.
   * for persistence).
   */
  resizable?: boolean
  /** Controlled column widths (px), keyed by column key. When supplied the table
   *  is controlled — it calls {@link onColumnWidthsChange} instead of owning the
   *  state. Missing keys are still auto-seeded by measurement. */
  columnWidths?: Record<string, number>
  /** Controlled-mode setter — receives the full next width map. */
  onColumnWidthsChange?: (next: Record<string, number>) => void
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
  rollups,
  renderCell,
  onRowClick,
  onOpenRow,
  rowActions,
  selection,
  getRowAriaLabel,
  variant = "list",
  rowActionsWidth,
  fill = false,
  flush = false,
  resizable = false,
  columnWidths,
  onColumnWidthsChange,
  className,
}: DataTableProps<TRow>) {
  const isEditable = variant === "editable"
  // Fill mode is a list-page-only layout; the editable variant (record-view
  // sections) always uses the document-flow card.
  const isFill = fill && !isEditable
  // Column resize is a fill-only feature (the editable variant sizes from its
  // own `width`/`grow` hints).
  const isResizable = isFill && resizable

  // --- Adjustable column widths -------------------------------------------
  // Controlled (consumer-owned, for persistence) or uncontrolled (session-only).
  // Seeding is lazy: a resizable table stays in auto (content-fit) layout until
  // the user first drags a handle. On that first drag every column is frozen to
  // its measured width (so the others don't reflow), then the dragged one moves.
  // This keeps auto-sizing for tables the user never touches, and — because the
  // seed happens in a pointer handler, not an effect — avoids a set-state-in-
  // effect cascade.
  const [internalWidths, setInternalWidths] = useState<Record<string, number>>({})
  const widths = columnWidths ?? internalWidths
  const applyWidths = useCallback(
    (next: Record<string, number>) => {
      if (onColumnWidthsChange) onColumnWidthsChange(next)
      else setInternalWidths(next)
    },
    [onColumnWidthsChange],
  )
  // Header-cell refs — read live to measure a column's current (content-fit)
  // width when it first freezes.
  const headerCellRefs = useRef(new Map<string, HTMLTableCellElement | null>())
  const measureColumn = useCallback((key: string) => {
    const element = headerCellRefs.current.get(key)
    if (!element) return MIN_COLUMN_WIDTH
    return Math.min(MAX_SEED_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(element.offsetWidth)))
  }, [])
  const setColumnWidth = useCallback(
    (key: string, nextWidth: number) => {
      // Freeze all columns to their current width on the first resize, then set
      // the dragged one — later resizes just update the map.
      const base: Record<string, number> = {}
      for (const column of columns) base[column.key] = widths[column.key] ?? measureColumn(column.key)
      base[key] = Math.max(MIN_COLUMN_WIDTH, Math.round(nextWidth))
      applyWidths(base)
    },
    [applyWidths, columns, measureColumn, widths],
  )
  // Every data column has a width → the fixed, resizable layout is live.
  const widthsSeeded =
    isResizable && columns.length > 0 && columns.every((column) => widths[column.key] != null)
  const canToggleSelection = selection ? selection.canToggleSelection ?? true : false
  const isRowSelectable = (row: TRow) =>
    selection?.isRowSelectable ? selection.isRowSelectable(row) : true
  // Row-click toggles selection on read-only selectable grids. The editable
  // variant is the exception: its data cells host inline editors, so clicking a
  // cell must NOT toggle selection — there the checkbox is the sole toggle and
  // the row body stays free for editing.
  const activateRow = selection
    ? isEditable
      ? undefined
      : (row: TRow) => {
          if (canToggleSelection && isRowSelectable(row)) selection.onToggleRow(row.id)
        }
    : onRowClick
  const interactive = Boolean(activateRow)
  const hasRowActions = Boolean(rowActions)
  const hasOpenColumn = Boolean(onOpenRow) || hasRowActions
  const selectionWidth = selection
    ? typeof selection.selectionWidth === "number"
      ? selection.selectionWidth
      : DEFAULT_SELECTION_WIDTH
    : 0
  // Editable rows carry their own row controls (no open button), so the gutter
  // is sized by `rowActionsWidth` — one icon by default, wider for multi-control
  // rows — rather than the list variant's open/open+actions sizing.
  const openColumnWidth = isEditable
    ? rowActionsWidth ?? DEFAULT_OPEN_WIDTH
    : hasRowActions
      ? OPEN_WIDTH_WITH_ACTIONS
      : DEFAULT_OPEN_WIDTH
  // A trailing spacer column absorbs slack in the resizable fixed layout so the
  // data columns keep their exact px widths (no proportional stretch) while the
  // table still fills the card. It is the only no-width col, so `table-fixed`
  // hands it whatever width remains.
  const hasSpacerColumn = widthsSeeded
  const totalColumns =
    columns.length + (selection ? 1 : 0) + (hasOpenColumn ? 1 : 0) + (hasSpacerColumn ? 1 : 0)

  // Fixed-layout table min-width for the resizable path: leading gutters + the
  // sum of every column's current width. When the container is narrower the
  // table scrolls; when wider the spacer takes the difference.
  const resizableTableMinWidth = widthsSeeded
    ? (selection ? selectionWidth : 0) +
      (hasOpenColumn ? openColumnWidth : 0) +
      columns.reduce((sum, column) => sum + (widths[column.key] ?? MIN_COLUMN_WIDTH), 0)
    : 0

  // Select-all state, computed from the current page's eligible rows. Drives the
  // header select-all checkbox (checked = all eligible ticked, indeterminate =
  // some). `selectedTotal` is the whole selection (all pages) for the footer.
  const pageEligibleIds = selection ? rows.filter(isRowSelectable).map((row) => row.id) : []
  const selectedEligibleCount = selection
    ? pageEligibleIds.reduce((count, id) => (selection.selectedIds.has(id) ? count + 1 : count), 0)
    : 0
  const allEligibleSelected =
    pageEligibleIds.length > 0 && selectedEligibleCount === pageEligibleIds.length
  const someEligibleSelected = selectedEligibleCount > 0 && !allEligibleSelected
  const selectedTotal = selection?.selectedIds.size ?? 0

  const editableLayout = isEditable
    ? buildEditableLayout(columns, [
        ...(selection ? [selectionWidth] : []),
        ...(hasOpenColumn ? [openColumnWidth] : []),
      ])
    : null

  // Sticky-header pin (fill mode only). The `<th>` cells — not the `<tr>` — carry
  // the sticky + opaque background so scrolling rows don't bleed through, and the
  // bottom border rides along with the pinned cell.
  const stickyHeaderCellClass = isFill
    ? "sticky top-0 z-10 bg-[var(--panel-background)] border-b border-[var(--panel-border)]"
    : undefined
  // Column divider between adjacent columns. Applied to every cell except the
  // trailing one so the card's own right border isn't doubled.
  const dividerClass = "border-r border-[var(--panel-border)]/60"

  // Pinned-footer rollups — rendered on the left of the pager (or standalone).
  const rollupsNode =
    rollups && rollups.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {rollups.map((rollup) => (
          <span key={rollup.label} className="inline-flex items-center gap-1.5">
            <span className="text-[var(--foreground)]/55">{rollup.label}</span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">
              {rollup.value}
            </span>
          </span>
        ))}
      </div>
    ) : null

  // Pinned-footer selection cluster — the always-visible "N selected · Clear" that
  // lets the user act on a batch without opening the export menu. Shows only when
  // the selection is non-empty. Scoped to fill (list-page) tables: the editable
  // record grids (e.g. imports staged inventory) run their own selection cluster,
  // so the DataTable must not add a second one there.
  const selectionNode =
    isFill && selection && selectedTotal > 0 ? (
      <span className="inline-flex items-center gap-2">
        <span className="font-medium tabular-nums text-[var(--foreground)]">
          {selectedTotal.toLocaleString()} selected
        </span>
        {selection.onClear ? (
          <button
            type="button"
            onClick={selection.onClear}
            className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-xs text-[var(--foreground)]/70 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
          >
            Clear
          </button>
        ) : null}
      </span>
    ) : null

  // Combined footer-left content: selection cluster then rollups.
  const footerLeadingNode =
    selectionNode || rollupsNode ? (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {selectionNode}
        {rollupsNode}
      </div>
    ) : null

  return (
    <div
      className={joinClassNames(
        "border border-[var(--panel-border)] bg-[var(--panel-background)]",
        // Fill: bounded full-height flex column running edge-to-edge — squared
        // corners + no shadow so it sits flush against its border. Flush
        // (non-fill): squared/unshadowed document-flow card that bleeds to the
        // section edge, horizontal scroll preserved. Non-fill: legacy rounded,
        // shadowed, clipped document-flow card.
        isFill
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : flush
            ? "overflow-hidden"
            : "overflow-hidden rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      {headerSlot ? (
        <div className="border-b border-[var(--panel-border)] px-3 py-2">{headerSlot}</div>
      ) : null}
      <div
        className={
          isFill
            ? "min-h-0 flex-1 overflow-auto overscroll-contain"
            : "overflow-x-auto overscroll-x-contain"
        }
      >
        <table
          className={joinClassNames(
            "w-full border-collapse",
            isEditable || widthsSeeded ? "table-fixed" : undefined,
          )}
          style={
            editableLayout
              ? { minWidth: editableLayout.tableMinWidth }
              : widthsSeeded
                ? { minWidth: resizableTableMinWidth }
                : undefined
          }
        >
          {editableLayout ? (
            <colgroup>
              {selection ? <col style={{ width: selectionWidth }} /> : null}
              {hasOpenColumn ? <col style={{ width: openColumnWidth }} /> : null}
              {editableLayout.cols.map((col) => (
                <col key={col.key} style={col.style} />
              ))}
            </colgroup>
          ) : widthsSeeded ? (
            <colgroup>
              {selection ? <col style={{ width: selectionWidth }} /> : null}
              {hasOpenColumn ? <col style={{ width: openColumnWidth }} /> : null}
              {columns.map((column) => (
                <col key={column.key} style={{ width: widths[column.key] }} />
              ))}
              {/* Slack-absorbing spacer — the only no-width col. */}
              <col />
            </colgroup>
          ) : null}
          <thead>
            <tr className="border-b border-[var(--panel-border)] bg-[var(--panel-border)]/10">
              {selection ? (
                <th
                  scope="col"
                  style={{ width: selection.selectionWidth ?? DEFAULT_SELECTION_WIDTH }}
                  className={joinClassNames("px-3 py-2", dividerClass, stickyHeaderCellClass)}
                >
                  {selection.onToggleAll ? (
                    <DataTableSelectCheckbox
                      checked={allEligibleSelected}
                      indeterminate={someEligibleSelected}
                      editable={canToggleSelection && pageEligibleIds.length > 0}
                      onChange={() => selection.onToggleAll?.(pageEligibleIds)}
                      ariaLabel={
                        allEligibleSelected ? "Clear all on this page" : "Select all on this page"
                      }
                    />
                  ) : (
                    <span className="sr-only">Select</span>
                  )}
                </th>
              ) : null}
              {hasOpenColumn ? (
                <th
                  scope="col"
                  style={{ width: openColumnWidth }}
                  className={joinClassNames("px-3 py-2", dividerClass, stickyHeaderCellClass)}
                >
                  <span className="sr-only">{hasRowActions ? "Actions" : "Open"}</span>
                </th>
              ) : null}
              {columns.map((column, index) => (
                <DataTableHeaderCell<TRow>
                  key={column.key}
                  column={column}
                  clip={widthsSeeded}
                  cellRef={
                    isResizable
                      ? (element) => {
                          headerCellRefs.current.set(column.key, element)
                        }
                      : undefined
                  }
                  className={joinClassNames(
                    // With the trailing spacer, even the last data column carries
                    // a divider (the spacer, not the card edge, follows it).
                    index < columns.length - 1 || hasSpacerColumn ? dividerClass : undefined,
                    stickyHeaderCellClass,
                  )}
                  resizeHandle={
                    isResizable ? (
                      <ColumnResizeHandle
                        getStartWidth={() => widths[column.key] ?? measureColumn(column.key)}
                        onResize={(next) => setColumnWidth(column.key, next)}
                        ariaLabel={`Resize ${column.label} column`}
                      />
                    ) : undefined
                  }
                />
              ))}
              {hasSpacerColumn ? (
                <th aria-hidden className={stickyHeaderCellClass} />
              ) : null}
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
                  aria-pressed={interactive && selection ? selected : undefined}
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
                      className={joinClassNames("px-3 py-2 text-center", dividerClass)}
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
                      className={joinClassNames("px-3 py-2", dividerClass)}
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
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={joinClassNames(
                        "px-3 py-2 text-sm text-[var(--foreground)]",
                        // List cells size to content and never wrap. Editable
                        // cells host full-width inline editors, so they drop
                        // `nowrap` and align to the input baseline.
                        isEditable ? "align-middle" : "whitespace-nowrap",
                        // Resizable columns are fixed-width, so clip overflow to
                        // keep long content inside its track instead of bleeding.
                        widthsSeeded ? "overflow-hidden" : undefined,
                        ALIGN_CLASS_NAME[column.align ?? "start"],
                        index < columns.length - 1 || hasSpacerColumn ? dividerClass : undefined,
                      )}
                    >
                      {renderCell
                        ? renderCell(column, row)
                        : column.render
                          ? column.render(row)
                          : renderDefaultCell(column, row)}
                    </td>
                  ))}
                  {hasSpacerColumn ? <td aria-hidden /> : null}
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination ? (
        // PaginateControls owns its own px-3 py-2 padding — no extra here. The
        // selection cluster + rollups ride its left `leading` slot so totals +
        // pager share one bar.
        <div className="border-t border-[var(--panel-border)]">
          <PaginateControls {...pagination} leading={footerLeadingNode} />
        </div>
      ) : footerLeadingNode ? (
        // Selection/rollups with no pager — a totals-only pinned footer.
        <div className="border-t border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--foreground)]/75">
          {footerLeadingNode}
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
