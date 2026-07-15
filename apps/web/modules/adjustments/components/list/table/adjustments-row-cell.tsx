import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatAdjustmentTransition,
  formatInventoryQuantity,
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
      return <CellChip paletteColor={row.color}>{row.adjustmentNumber}</CellChip>
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
    case "area":
      return row.area || "-"
    case "quantity":
      return (
        <CellChip tone={row.adjustmentType === "INCREASE" ? "success" : "error"}>
          {formatSignedAdjustmentQuantity(row.quantity, row.adjustmentType, row.unitAbbrev ?? "")}
        </CellChip>
      )
    case "converted": {
      // Derived unit-conversion of the adjustment's own quantity (basis = quantity),
      // resolved on-read. Empty string when the adjustment has no linked formula.
      const converted = row.convertedBalance
      return converted ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(converted, row.conversionUnitAbbrev ?? "")}
        </span>
      ) : (
        "-"
      )
    }
    case "adjustment": {
      const transition = formatAdjustmentTransition(row.before, row.after, row.unitAbbrev ?? "")
      return transition != null ? <span className="tabular-nums">{transition}</span> : "-"
    }
    case "isWaste":
      return row.isWaste ? (
        <span className="tabular-nums">Waste</span>
      ) : (
        <span className="text-[var(--text-muted)]">-</span>
      )
    case "internalNotes":
      return row.internalNotes || "-"
    case "warehouseName":
      return row.warehouseName || "-"
    case "workOrderNumber":
      return row.workOrderNumber || "-"
    case "createdAt":
      return formatAdjustmentTimestamp(row.createdAt)
    case "updatedAt":
      return formatAdjustmentTimestamp(row.updatedAt)
    case "createdBy":
      return row.createdBy ?? "—"
    case "updatedBy":
      return row.updatedBy ?? "—"
    default:
      return "-"
  }
}
