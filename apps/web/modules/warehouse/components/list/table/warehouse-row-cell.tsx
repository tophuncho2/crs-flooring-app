import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, formatPhoneNumber, type WarehouseListRow } from "@builders/domain"

export function renderWarehouseRowCell(
  column: DataTableColumn<WarehouseListRow>,
  row: WarehouseListRow,
): ReactNode {
  switch (column.key) {
    case "warehouseNumber":
      return <span className="font-medium tabular-nums">{row.warehouseNumber}</span>
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "streetAddress":
      return row.streetAddress || "-"
    case "city":
      return row.city || "-"
    case "state":
      return row.state || "-"
    case "postalCode":
      return row.postalCode || "-"
    case "phone":
      return <span>{formatPhoneNumber(row.phone ?? "") || "—"}</span>
    case "workOrdersCount":
      return <span className="tabular-nums">{row.workOrdersCount}</span>
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    case "updatedAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
