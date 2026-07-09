import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, formatMoney, type ProductListRow } from "@builders/domain"

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
    case "unit":
      // Unit column renders the abbreviation off the FK (per the UoM matrix).
      return row.unit?.abbreviation || "-"
    case "coveragePerUnit":
      // Coverage column pairs with the product's OWN coverage unit (UoM epic 1b),
      // distinct from the main `unit` column above.
      return row.coveragePerUnit
        ? `${row.coveragePerUnit} ${row.coverageUnit?.abbreviation ?? ""}`.trim()
        : "-"
    case "cost": {
      // Money cost paired with the unit it's priced per (e.g. "$5.00 / sq ft").
      // Mirrors the coveragePerUnit cell but formats the value as money.
      if (!row.cost) return "-"
      const price = formatMoney(row.cost)
      const abbr = row.costUnit?.abbreviation
      return abbr ? `${price} / ${abbr}` : price
    }
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
