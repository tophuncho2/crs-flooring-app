import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import {
  composeRollNumberDisplay,
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
      return composeRollNumberDisplay(row.rollPrefix, row.rollNumber) || "-"
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
    case "coverageBalance":
      return row.coverageBalance ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.coverageBalance, row.itemCoverageUnitAbbrev)}
        </span>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    case "coveragePerUnit":
      return row.coveragePerUnit ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.coveragePerUnit, row.itemCoverageUnitAbbrev)}
        </span>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    case "totalCutSum":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.totalCutSum, row.stockUnitAbbrev)}
        </span>
      )
    case "fifoReceivedAt":
      return formatFifoReceivedAtEastern(row.fifoReceivedAt)
    case "updatedAt":
      return formatEasternDateTime(row.updatedAt) || "—"
    default:
      return "-"
  }
}
