import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import type { CategoryListRow } from "@builders/domain"

export function renderCategoryRowCell(
  column: DataTableColumn<CategoryListRow>,
  row: CategoryListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "stockUnit":
      return row.stockUnit || "-"
    default:
      return "-"
  }
}
