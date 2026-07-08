"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { JobTypeListRow } from "@builders/domain"
import { JOB_TYPES_LIST_COLUMNS } from "./table/job-types-list-columns"
import { renderJobTypeRowCell } from "./table/job-types-row-cell"

export function JobTypesTable({
  rows,
  onOpenJobType,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: JobTypeListRow[]
  onOpenJobType: (row: JobTypeListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<JobTypeListRow>
      fill
      resizable
      rows={rows}
      columns={JOB_TYPES_LIST_COLUMNS}
      empty="No job types match this search."
      onOpenRow={(row) => onOpenJobType(row)}
      getRowAriaLabel={(row) => `Open job type ${row.name}`}
      renderCell={renderJobTypeRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
