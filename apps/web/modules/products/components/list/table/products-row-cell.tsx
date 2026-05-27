import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { formatEasternDateTime, type ProductListRow } from "@builders/domain"

export function renderProductRowCell(
  column: DataTableColumn<ProductListRow>,
  row: ProductListRow,
): ReactNode {
  switch (column.key) {
    case "category":
      return <span className="font-medium text-blue-500">{row.category.name}</span>
    case "name":
      return row.name || "Pending name"
    case "manufacturer":
      return row.manufacturerName || "-"
    case "style":
      return row.style || "-"
    case "color":
      return row.color || "-"
    case "note":
      return row.note || "-"
    case "coverage":
      return row.coveragePerUnit ? (
        <span className="tabular-nums">
          {row.coveragePerUnit} / {row.itemCoverageUnitName || "unit"}
        </span>
      ) : (
        "-"
      )
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "updatedAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
