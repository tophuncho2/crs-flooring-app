import type { DataTableColumn } from "@/components/data-table"
import type { JobTypeListRow } from "@builders/domain"

export const JOB_TYPES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<JobTypeListRow>
> = [
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
