import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatAdjustmentTransition,
  formatSignedAdjustmentQuantity,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"

/**
 * Per-cell renderer for the adjustments ledger `DataTable`. Plain-span rendering
 * to match the sibling inventory list, reusing the shared inventory quantity /
 * roll-number formatters. Nullable adjustment snapshot fields fall back to "-".
 */
export function renderAdjustmentsRowCell(
  column: DataTableColumn<EnrichedInventoryAdjustmentRow>,
  row: EnrichedInventoryAdjustmentRow,
): ReactNode {
  switch (column.key) {
    case "adjustmentNumber":
      return <span className="font-medium">{row.adjustmentNumber}</span>
    case "adjustmentType":
      return row.adjustmentType === "INCREASE" ? "Increase" : "Deduction"
    case "productName":
      return row.productName || "-"
    case "inventoryNumber":
      return row.inventoryNumber || "-"
    case "rollNumber":
      return row.rollNumber || "-"
    case "dyeLot":
      return row.dyeLot || "-"
    case "inventoryNote":
      return row.inventoryNote || "-"
    case "location":
      return row.location || "-"
    case "quantity":
      return (
        <span className="tabular-nums">
          {formatSignedAdjustmentQuantity(row.quantity, row.adjustmentType, row.stockUnitAbbrev ?? "")}
        </span>
      )
    case "adjustment": {
      const transition = formatAdjustmentTransition(row.before, row.after, row.stockUnitAbbrev ?? "")
      return transition != null ? <span className="tabular-nums">{transition}</span> : "-"
    }
    case "isWaste":
      return row.isWaste ? (
        <span className="tabular-nums">Waste</span>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    case "notes":
      return row.notes || "-"
    case "warehouseName":
      return row.warehouseName || "-"
    case "workOrderNumber":
      return row.workOrderNumber || "-"
    case "createdAt":
      return formatAdjustmentTimestamp(row.createdAt)
    case "updatedAt":
      return formatAdjustmentTimestamp(row.updatedAt)
    default:
      return "-"
  }
}
