import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type ImportRow } from "@builders/domain"

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
        <CellChip paletteColor={row.color}>{formatImportNumber(row.importNumber)}</CellChip>
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
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "updatedAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
      )
    case "createdBy":
      return row.createdBy || "—"
    case "updatedBy":
      return row.updatedBy || "—"
    default:
      return "-"
  }
}
