import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
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
      return row.category.name || "-"
    case "name":
      return row.name || "Pending name"
    case "entity":
      return row.entityName || "-"
    case "style":
      return row.style || "-"
    case "color":
      return row.color || "-"
    case "productNamingAddon":
      return row.productNamingAddon || "-"
    case "stockUnit":
      return formatUnit(row.stockUnitName, row.stockUnitAbbrev)
    case "coveragePerUnit":
      return row.coveragePerUnit
        ? `${row.coveragePerUnit} ${row.stockUnitAbbrev}`.trim()
        : "-"
    case "productNumber":
      return <CellChip paletteColor={row.paletteColor}>{row.productNumber}</CellChip>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
