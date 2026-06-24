"use client"

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"
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
 * One `<thead>` cell for the {@link DataTable}. Hosts the column label and, when
 * supplied, a sort caret (`sortable` + `onSort`). Extracted to a component so the
 * header stays a single mapped element. (Table-level filters now live in the
 * gutter `TableOptions` menu, not a per-column header funnel.)
 */
export function DataTableHeaderCell<TRow extends DataTableRow>({
  column,
  sorts,
  onSort,
}: {
  column: DataTableColumn<TRow>
  sorts?: ReadonlyArray<{ field: string; direction: "asc" | "desc" }>
  onSort?: (key: string) => void
}) {
  const align = column.align ?? "start"
  const isSortable = Boolean(column.sortable && onSort)
  const activeSorts = sorts ?? []
  const sortIndex = isSortable ? activeSorts.findIndex((entry) => entry.field === column.key) : -1
  const activeSort = sortIndex >= 0 ? activeSorts[sortIndex] : null
  const isActiveSort = activeSort !== null
  // 1-based priority badge — only shown when a chain of >1 columns is active.
  const sortPriority = activeSorts.length > 1 && sortIndex >= 0 ? sortIndex + 1 : null

  const labelContent = isSortable ? (
    <button
      type="button"
      onClick={() => onSort?.(column.key)}
      aria-label={`Sort by ${column.label}${
        isActiveSort ? (activeSort.direction === "asc" ? " (ascending)" : " (descending)") : ""
      }${sortPriority ? ` (priority ${sortPriority})` : ""}`}
      className={joinClassNames(
        "inline-flex items-center gap-1 rounded transition hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        align === "end" ? "flex-row-reverse" : undefined,
        isActiveSort ? "text-[var(--foreground)]" : undefined,
      )}
    >
      <span>{column.label}</span>
      {isActiveSort ? (
        activeSort.direction === "asc" ? (
          <ChevronUp size={15} strokeWidth={2.5} aria-hidden="true" className="text-sky-500" />
        ) : (
          <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" className="text-sky-500" />
        )
      ) : (
        <ChevronsUpDown size={15} strokeWidth={2.5} aria-hidden="true" className="opacity-60" />
      )}
      {sortPriority ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-flex min-w-[14px] items-center justify-center rounded-sm bg-sky-500/15 px-1 text-[10px] font-bold leading-none text-sky-500"
        >
          {sortPriority}
        </span>
      ) : null}
    </button>
  ) : (
    <span>{column.label}</span>
  )

  return (
    <th
      scope="col"
      aria-sort={
        isActiveSort ? (activeSort.direction === "asc" ? "ascending" : "descending") : undefined
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
      </span>
    </th>
  )
}
