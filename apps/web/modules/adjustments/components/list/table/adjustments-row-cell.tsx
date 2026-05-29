import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
import {
  composeRollNumberDisplay,
  formatInventoryQuantity,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"

/**
 * Per-cell renderer for the adjustments ledger `DataTable`. Plain-span rendering
 * to match the sibling inventory list, reusing the shared status badge +
 * inventory quantity / roll-number formatters. Nullable adjustment snapshot
 * fields fall back to "-".
 */
export function renderAdjustmentsRowCell(
  column: DataTableColumn<EnrichedInventoryAdjustmentRow>,
  row: EnrichedInventoryAdjustmentRow,
): ReactNode {
  switch (column.key) {
    case "adjustmentNumber":
      return <span className="font-medium">{row.adjustmentNumber}</span>
    case "status":
      return <AdjustmentStatusBadge status={row.status} />
    case "adjustmentType":
      return row.adjustmentType === "INCREASE" ? "Increase" : "Deduction"
    case "productName":
      return row.productName || "-"
    case "inventoryNumber":
      return row.inventoryNumber || "-"
    case "rollNumber":
      return composeRollNumberDisplay(row.rollPrefix ?? "", row.rollNumber ?? "") || "-"
    case "dyeLot":
      return row.dyeLot || "-"
    case "inventoryNote":
      return row.inventoryNote || "-"
    case "location":
      return row.location || "-"
    case "before":
      return row.before != null ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.before, row.stockUnitAbbrev ?? "")}
        </span>
      ) : (
        "-"
      )
    case "quantity":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.quantity, row.stockUnitAbbrev ?? "")}
        </span>
      )
    case "after":
      return row.after != null ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.after, row.stockUnitAbbrev ?? "")}
        </span>
      ) : (
        "-"
      )
    case "coverage":
      return row.coverage ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.coverage, row.itemCoverageUnitAbbrev ?? "")}
        </span>
      ) : (
        "-"
      )
    case "isWaste":
      return row.isWaste ? (
        <span className="tabular-nums">Waste</span>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    case "finalSequence":
      return row.finalSequence != null ? (
        <span className="tabular-nums">{row.finalSequence}</span>
      ) : (
        "-"
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
