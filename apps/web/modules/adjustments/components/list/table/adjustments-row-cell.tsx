import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import {
  composeRollNumberDisplay,
  formatInventoryQuantity,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { formatCutLogTimestamp } from "@/modules/cut-logs/components/row/format-cut-log-timestamp"

/**
 * Per-cell renderer for the cut-logs ledger `DataTable`. Plain-span rendering
 * to match the sibling inventory list, reusing the shared status badge +
 * inventory quantity / roll-number formatters. Nullable cut-log snapshot
 * fields fall back to "-".
 */
export function renderCutLogsRowCell(
  column: DataTableColumn<EnrichedInventoryAdjustmentRow>,
  row: EnrichedInventoryAdjustmentRow,
): ReactNode {
  switch (column.key) {
    case "cutLogNumber":
      return <span className="font-medium">{row.adjustmentNumber}</span>
    case "status":
      return <CutLogStatusBadge status={row.status} />
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
    case "quantity":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.quantity, row.stockUnitAbbrev ?? "")}
        </span>
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
      return formatCutLogTimestamp(row.createdAt)
    case "updatedAt":
      return formatCutLogTimestamp(row.updatedAt)
    default:
      return "-"
  }
}
