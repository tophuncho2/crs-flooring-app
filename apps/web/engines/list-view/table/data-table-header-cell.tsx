"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronsUpDown, ChevronUp, ListFilter } from "lucide-react"
import { AnchoredPanel } from "@/engines/common"
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
 * Per-column filter descriptor — the table-level companion to {@link DataTableColumn}
 * (mirrors how `sortable`/`onSort` and `renderCell` split static column shape from
 * dynamic behavior). When a column key maps to one of these, its header grows a
 * funnel affordance that opens an {@link AnchoredPanel} hosting the consumer-supplied
 * filter body. The engine owns the affordance + popover chrome; it never learns what
 * the column actually filters on — the consumer renders that.
 */
export type DataTableColumnFilter = {
  /** True when this column's filter is narrowing the list (tints the funnel). */
  active: boolean
  /** Renders the popover body. Call `close` to dismiss the panel (e.g. after Apply). */
  render: (close: () => void) => ReactNode
  /** Popover title shown in the panel's sticky header. Defaults to the column label. */
  title?: ReactNode
}

/**
 * One `<thead>` cell for the {@link DataTable}. Hosts the column label and, when
 * supplied, a sort caret (`sortable` + `onSort`) and/or a filter funnel
 * (`filter`). Extracted to a component so the funnel can own its popover
 * open-state with a hook — illegal inside the header `.map`.
 */
export function DataTableHeaderCell<TRow extends DataTableRow>({
  column,
  sort,
  onSort,
  filter,
}: {
  column: DataTableColumn<TRow>
  sort?: { field: string; direction: "asc" | "desc" } | null
  onSort?: (key: string) => void
  filter?: DataTableColumnFilter
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const align = column.align ?? "start"
  const isSortable = Boolean(column.sortable && onSort)
  const isActiveSort = isSortable && sort?.field === column.key

  const labelContent = isSortable ? (
    <button
      type="button"
      onClick={() => onSort?.(column.key)}
      aria-label={`Sort by ${column.label}${
        isActiveSort ? (sort?.direction === "asc" ? " (ascending)" : " (descending)") : ""
      }`}
      className={joinClassNames(
        "inline-flex items-center gap-1 rounded transition hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        align === "end" ? "flex-row-reverse" : undefined,
        isActiveSort ? "text-[var(--foreground)]" : undefined,
      )}
    >
      <span>{column.label}</span>
      {isActiveSort ? (
        sort?.direction === "asc" ? (
          <ChevronUp size={15} strokeWidth={2.5} aria-hidden="true" className="text-sky-500" />
        ) : (
          <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" className="text-sky-500" />
        )
      ) : (
        <ChevronsUpDown size={15} strokeWidth={2.5} aria-hidden="true" className="opacity-60" />
      )}
    </button>
  ) : (
    <span>{column.label}</span>
  )

  const filterControl = filter ? (
    <AnchoredPanel
      open={filterOpen}
      onClose={() => setFilterOpen(false)}
      stickyHeader={
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70">
          {filter.title ?? column.label}
        </span>
      }
      trigger={
        <button
          type="button"
          onClick={() => setFilterOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
          aria-label={`Filter by ${column.label}`}
          className={joinClassNames(
            "inline-flex items-center rounded p-0.5 transition hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
            filter.active ? "text-sky-500" : "opacity-60",
          )}
        >
          <ListFilter size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      }
    >
      {filter.render(() => setFilterOpen(false))}
    </AnchoredPanel>
  ) : null

  return (
    <th
      scope="col"
      aria-sort={
        isActiveSort ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined
      }
      className={joinClassNames(
        "whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70",
        ALIGN_CLASS_NAME[align],
      )}
    >
      <span
        className={joinClassNames(
          "inline-flex items-center gap-1.5",
          align === "end" ? "flex-row-reverse" : undefined,
          align === "center" ? "justify-center" : undefined,
        )}
      >
        {labelContent}
        {filterControl}
      </span>
    </th>
  )
}
