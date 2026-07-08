"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { JobTypeListRow } from "@builders/domain"
import { JOB_TYPES_LIST_COLUMNS } from "./table/job-types-list-columns"
import { renderJobTypeRowCell } from "./table/job-types-row-cell"

export function JobTypesTable({
  rows,
  onOpenJobType,
  pagination,
}: {
  rows: JobTypeListRow[]
  onOpenJobType: (row: JobTypeListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<JobTypeListRow>
      fill
      rows={rows}
      columns={JOB_TYPES_LIST_COLUMNS}
      empty="No job types match this search."
      onOpenRow={(row) => onOpenJobType(row)}
      getRowAriaLabel={(row) => `Open job type ${row.name}`}
      renderCell={renderJobTypeRowCell}
      pagination={pagination}
    />
  )
}
