import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import {
  formatEasternDateTime,
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
      return <CellChip paletteColor={row.color}>{row.inventoryNumber}</CellChip>
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
    case "warehouseName":
      return row.warehouseName || "-"
    case "stockBalance":
      return (
        <span className="font-semibold tabular-nums">
          {formatInventoryQuantity(row.stockBalance, row.unitAbbrev)}
        </span>
      )
    case "converted": {
      const converted = row.convertedStockBalance
      return converted ? (
        <span className="tabular-nums">
          {formatInventoryQuantity(converted, row.conversionUnitAbbrev ?? "")}
        </span>
      ) : (
        "-"
      )
    }
    case "netDeducted":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.netDeducted, row.unitAbbrev)}
        </span>
      )
    case "startingStock":
      return (
        <span className="tabular-nums">
          {formatInventoryQuantity(row.startingStock, row.unitAbbrev)}
        </span>
      )
    case "purchaseOrderNumber":
      return row.purchaseOrderNumber || "-"
    case "importNumber":
      return row.importNumber != null ? String(row.importNumber) : "-"
    case "createdAt": {
      // Age-indicator chip — color derived server-side (ceiling/up-to). Guard
      // nullish → plain text so a row older than every threshold stays uncolored.
      const text = formatEasternDateTime(row.createdAt) || "—"
      return row.createdAtAgeColor ? (
        <CellChip paletteColor={row.createdAtAgeColor}>{text}</CellChip>
      ) : (
        text
      )
    }
    case "updatedAt":
      return formatEasternDateTime(row.updatedAt) || "—"
    case "balanceLastChangedAt": {
      if (!row.balanceLastChangedAt) return "—"
      const text = formatEasternDateTime(row.balanceLastChangedAt)
      return row.balanceChangedAgeColor ? (
        <CellChip paletteColor={row.balanceChangedAgeColor}>{text}</CellChip>
      ) : (
        text
      )
    }
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
