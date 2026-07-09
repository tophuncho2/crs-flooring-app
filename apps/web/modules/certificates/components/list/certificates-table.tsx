"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { CertificateListRow } from "@builders/domain"
import { CERTIFICATES_LIST_COLUMNS } from "./table/certificates-list-columns"
import { renderCertificateRowCell } from "./table/certificates-row-cell"

export function CertificatesTable({
  rows,
  onOpenCertificate,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: CertificateListRow[]
  onOpenCertificate: (row: CertificateListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<CertificateListRow>
      fill
      resizable
      rows={rows}
      columns={CERTIFICATES_LIST_COLUMNS}
      empty="No certificates match these filters."
      onOpenRow={(row) => onOpenCertificate(row)}
      getRowAriaLabel={(row) => `Open certificate ${row.name}`}
      renderCell={renderCertificateRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
