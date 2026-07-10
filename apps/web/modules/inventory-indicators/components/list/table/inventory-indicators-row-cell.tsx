import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type InventoryIndicatorRow } from "@builders/domain"
import { IndicatorStatusChip } from "@/modules/inventory-indicators/components/status/indicator-status-chip"

/** Per-cell renderer for the inventory-indicators `DataTable`. */
export function renderIndicatorsRowCell(
  column: DataTableColumn<InventoryIndicatorRow>,
  row: InventoryIndicatorRow,
): ReactNode {
  switch (column.key) {
    case "status":
      return <IndicatorStatusChip status={row.status} label={row.statusLabel} />
    case "indicatorNumber":
      return row.indicatorNumber
    case "productName":
      return row.productName || "-"
    case "warehouseName":
      return row.warehouseName || "-"
    case "unit":
      return row.unitAbbrev || row.unitName || "-"
    case "currentStock":
      return (
        <span className="tabular-nums">
          {`${row.currentStock}${row.unitAbbrev ? ` ${row.unitAbbrev}` : ""}`}
        </span>
      )
    case "lowStockThreshold":
      return row.lowStockThreshold ? (
        <span className="tabular-nums">{row.lowStockThreshold}</span>
      ) : (
        <span className="text-[var(--text-muted)]">—</span>
      )
    case "isActive":
      return row.isActive ? "Active" : "Muted"
    case "createdAt":
      return formatEasternDateTime(row.createdAt)
    case "updatedAt":
      return formatEasternDateTime(row.updatedAt)
    case "createdBy":
      return row.createdBy ?? "—"
    case "updatedBy":
      return row.updatedBy ?? "—"
    default:
      return "-"
  }
}
