import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { formatStableDate, type ImportRow } from "@builders/domain"

function formatImportNumber(value: number): string {
  return `IMP-${value}`
}

export function renderImportsRowCell(
  column: DataTableColumn<ImportRow>,
  row: ImportRow,
): ReactNode {
  switch (column.key) {
    case "importNumber":
      return (
        <span className="font-medium text-blue-500">
          {formatImportNumber(row.importNumber)}
        </span>
      )
    case "warehouseName":
      return row.warehouseName || "-"
    case "manufacturerName":
      return row.manufacturerName || "-"
    case "purchaseOrderNumber":
      return row.purchaseOrderNumber || "-"
    case "stagedInventoryRowsCount":
      return <span className="tabular-nums">{row.stagedInventoryRowsCount}</span>
    case "liveInventoryRowsCount":
      return <span className="tabular-nums">{row.liveInventoryRowsCount}</span>
    case "createdAt":
      return formatStableDate(row.createdAt)
    default:
      return "-"
  }
}
