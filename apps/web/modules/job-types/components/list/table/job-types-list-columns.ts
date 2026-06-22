import type { DataTableColumn } from "@/engines/list-view"
import type { JobTypeListRow } from "@builders/domain"

export const JOB_TYPES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<JobTypeListRow>
> = [
  { key: "jobTypeNumber", label: "JT #" },
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
