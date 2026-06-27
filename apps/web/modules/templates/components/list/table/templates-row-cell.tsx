import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type TemplateListRow } from "@builders/domain"

/**
 * Per-cell renderer for the templates list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given
 * row. Wired into `<DataTable renderCell={renderTemplateRowCell} />`.
 */
export function renderTemplateRowCell(
  column: DataTableColumn<TemplateListRow>,
  row: TemplateListRow,
): ReactNode {
  switch (column.key) {
    case "unitType":
      return row.unitType || "-"
    case "property":
      return row.propertyName || "-"
    case "entity":
      return row.entityName || "-"
    case "jobType":
      return row.jobTypeName || "-"
    case "warehouse":
      return row.warehouseName || "-"
    case "description":
      return row.description || "-"
    case "items":
      return <span className="tabular-nums">{row.itemsCount}</span>
    case "templateNumber":
      return <CellChip paletteColor={row.color}>{row.templateNumber}</CellChip>
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
