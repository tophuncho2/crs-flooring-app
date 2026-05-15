import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import type { ProductListRow } from "@builders/domain"

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
    case "coverage":
      return row.coveragePerUnit ? (
        <span className="tabular-nums">
          {row.coveragePerUnit} / {row.itemCoverageUnitName || "unit"}
        </span>
      ) : (
        "-"
      )
    case "width":
      return row.width || "-"
    case "sheetSize":
      return row.sheetSize || "-"
    case "thickness":
      return row.thickness || "-"
    case "unitWeight":
      return row.unitWeight || "-"
    default:
      return "-"
  }
}
