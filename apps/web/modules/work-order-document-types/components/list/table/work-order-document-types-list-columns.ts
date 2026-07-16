import type { DataTableColumn } from "@/engines/list-view"
import type { WorkOrderDocumentTypeListRow } from "@builders/domain"

export const WORK_ORDER_DOCUMENT_TYPES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<WorkOrderDocumentTypeListRow>
> = [
  { key: "workOrderDocumentTypeNumber", label: "ROW #" },
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
