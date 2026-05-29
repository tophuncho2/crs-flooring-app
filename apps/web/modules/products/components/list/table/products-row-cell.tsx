import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { formatEasternDateTime, type ProductListRow } from "@builders/domain"

// Unit snapshot cell: "Name (abbrev)" when both present, else the name, else "-".
function formatUnit(name: string, abbrev: string): string {
  if (!name) return "-"
  return abbrev ? `${name} (${abbrev})` : name
}

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
    case "stockUnit":
      return formatUnit(row.stockUnitName, row.stockUnitAbbrev)
    case "sendUnit":
      return formatUnit(row.sendUnitName, row.sendUnitAbbrev)
    case "itemCoverageUnit":
      return formatUnit(row.itemCoverageUnitName, row.itemCoverageUnitAbbrev)
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
