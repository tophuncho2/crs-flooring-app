import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import {
  formatEasternDateTime,
  formatStableDate,
  type CertificateListRow,
} from "@builders/domain"

/**
 * Per-cell renderer for the certificates list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given row.
 * The Status cell is the read-time expiration chip.
 */
export function renderCertificateRowCell(
  column: DataTableColumn<CertificateListRow>,
  row: CertificateListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "entity":
      return row.entity?.entity ?? "-"
    case "expirationDate":
      return (
        <span className="tabular-nums">
          {row.expirationDate ? formatStableDate(row.expirationDate) : "—"}
        </span>
      )
    case "status":
      return <CellChip tone={row.status.tone}>{row.status.label}</CellChip>
    case "internalNotes":
      return <span className="block max-w-[24rem] truncate">{row.internalNotes || "-"}</span>
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
