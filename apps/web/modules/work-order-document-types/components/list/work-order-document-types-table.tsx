"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { WorkOrderDocumentTypeListRow } from "@builders/domain"
import { WORK_ORDER_DOCUMENT_TYPES_LIST_COLUMNS } from "./table/work-order-document-types-list-columns"
import { renderWorkOrderDocumentTypeRowCell } from "./table/work-order-document-types-row-cell"

export function WorkOrderDocumentTypesTable({
  rows,
  onOpenWorkOrderDocumentType,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: WorkOrderDocumentTypeListRow[]
  onOpenWorkOrderDocumentType: (row: WorkOrderDocumentTypeListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<WorkOrderDocumentTypeListRow>
      fill
      resizable
      rows={rows}
      columns={WORK_ORDER_DOCUMENT_TYPES_LIST_COLUMNS}
      empty="No document types match this search."
      onOpenRow={(row) => onOpenWorkOrderDocumentType(row)}
      getRowAriaLabel={(row) => `Open document type ${row.name}`}
      renderCell={renderWorkOrderDocumentTypeRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
