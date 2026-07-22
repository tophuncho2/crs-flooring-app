import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, type InventoryAgeIndicatorListRow } from "@builders/domain"

export function renderInventoryAgeIndicatorRowCell(
  column: DataTableColumn<InventoryAgeIndicatorListRow>,
  row: InventoryAgeIndicatorListRow,
): ReactNode {
  switch (column.key) {
    case "days":
      // Palette chip wraps the `days` identity cell — the same color painted onto
      // matching inventory date cells, so this list doubles as the color legend.
      return <CellChip paletteColor={row.color}>{row.days}</CellChip>
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    case "updatedAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
