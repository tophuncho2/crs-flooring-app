"use client"

import type { ReactNode, Ref } from "react"
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

/**
 * One `<thead>` cell for the {@link DataTable}. Renders a static column label.
 *
 * The clickable header sort affordance (caret + priority badge) was **removed**
 * — sorting is driven exclusively by the toolbar's multi-column Sort menu
 * (`SortMenuBody`). The header never renders an interactive control, so the sort
 * affordance can't be re-introduced per module by passing `sortable`/`onSort`.
 * (Table-level filters likewise live in the toolbar's Filter/Search menus, not a
 * per-column header funnel.)
 */
export function DataTableHeaderCell<TRow extends DataTableRow>({
  column,
  className,
  cellRef,
  resizeHandle,
  clip = false,
}: {
  column: DataTableColumn<TRow>
  /** Extra classes from the table (sticky-header pin + column divider). */
  className?: string
  /** Ref to the underlying `<th>` — the table measures it to seed resize widths. */
  cellRef?: Ref<HTMLTableCellElement>
  /** Column-resize grab handle, rendered at the cell's right edge (resizable
   *  tables). Requires the cell to be `position: relative`. */
  resizeHandle?: ReactNode
  /**
   * Clip an over-long label to the (now fixed-width) track. Only true once the
   * resizable table has frozen to fixed layout — in auto layout the header must
   * stay content-fit so the seeded widths are the real natural widths.
   */
  clip?: boolean
}) {
  const align = column.align ?? "start"

  return (
    <th
      ref={cellRef}
      scope="col"
      className={joinClassNames(
        "whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
        // `relative` hosts the absolute edge handle; `overflow-hidden` only once
        // the track is fixed so it can't eat the natural content-fit measurement.
        resizeHandle ? "relative" : undefined,
        clip ? "overflow-hidden" : undefined,
        ALIGN_CLASS_NAME[align],
        className,
      )}
    >
      <span
        className={joinClassNames(
          "inline-flex items-center gap-1.5",
          align === "end" ? "flex-row-reverse" : undefined,
          align === "center" ? "justify-center" : undefined,
        )}
      >
        <span className={clip ? "truncate" : undefined}>{column.label}</span>
      </span>
      {resizeHandle}
    </th>
  )
}
