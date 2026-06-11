import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { StatusBadge } from "@/engines/common"
import {
  formatEasternDateTime,
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  type InventoryRow,
} from "@builders/domain"

/**
 * Per-cell renderer for the inventory list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given
 * row. Wired into `<DataTable renderCell={renderInventoryRowCell} />`.
 */
export function renderInventoryRowCell(
  column: DataTableColumn<InventoryRow>,
  row: InventoryRow,
): ReactNode {
  switch (column.key) {
    case "inventoryNumber":
      return <span className="font-medium">{row.inventoryNumber}</span>
    case "productName":
      return row.productName || "-"
    case "rollNumber":
      return row.rollNumber || "-"
    case "location":
      return row.location || "-"
    case "dyeLot":
      return row.dyeLot || "-"
    case "note":
      return row.note || "-"
    case "warehouse":
      return row.warehouseName || "-"
    case "stockBalance":
      return (
        <span className="font-semibold tabular-nums">
          {formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev)}
        </span>
      )
    case "netDeducted":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.netDeducted, row.stockUnitAbbrev)}
        </span>
      )
    case "startingStock":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.startingStock, row.stockUnitAbbrev)}
        </span>
      )
    case "categoryName":
      return row.categoryName || "-"
    case "purchaseOrderNumber":
      return row.purchaseOrderNumber || "-"
    case "importNumber":
      return row.importNumber || "-"
    case "fifoReceivedAt":
      return formatFifoReceivedAtEastern(row.fifoReceivedAt)
    case "updatedAt":
      return formatEasternDateTime(row.updatedAt) || "—"
    case "wasMerged":
      return row.wasMerged ? (
        <StatusBadge tone="warning" size="sm">
          Merged
        </StatusBadge>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    default:
      return "-"
  }
}
