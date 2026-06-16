"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
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
  pagination?: ReactNode
}) {
  return (
    <DataTable<JobTypeListRow>
      rows={rows}
      columns={JOB_TYPES_LIST_COLUMNS}
      empty="No job types match this search."
      onOpenRow={(row) => onOpenJobType(row)}
      getRowAriaLabel={(row) => `Open job type ${row.name}`}
      renderCell={renderJobTypeRowCell}
      footerSlot={pagination}
    />
  )
}
