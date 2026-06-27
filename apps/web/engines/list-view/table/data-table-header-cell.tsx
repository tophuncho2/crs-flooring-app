"use client"

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
}: {
  column: DataTableColumn<TRow>
}) {
  const align = column.align ?? "start"

  return (
    <th
      scope="col"
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
        <span>{column.label}</span>
      </span>
    </th>
  )
}
