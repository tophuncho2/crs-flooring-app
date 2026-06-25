"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { JobTypeListRow } from "@builders/domain"
import { JOB_TYPES_LIST_COLUMNS } from "./table/job-types-list-columns"
import { renderJobTypeRowCell } from "./table/job-types-row-cell"

export function JobTypesTable({
  rows,
  onOpenJobType,
  tableOptions,
  pagination,
}: {
  rows: JobTypeListRow[]
  onOpenJobType: (row: JobTypeListRow) => void
  /** Gutter TableOptions menu (the "JT #" row-number search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}) {
  return (
    <DataTable<JobTypeListRow>
      rows={rows}
      columns={JOB_TYPES_LIST_COLUMNS}
      empty="No job types match this search."
      tableOptions={tableOptions}
      onOpenRow={(row) => onOpenJobType(row)}
      getRowAriaLabel={(row) => `Open job type ${row.name}`}
      renderCell={renderJobTypeRowCell}
      pagination={pagination}
    />
  )
}
