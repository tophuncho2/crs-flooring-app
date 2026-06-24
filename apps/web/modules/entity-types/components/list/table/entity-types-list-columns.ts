import type { DataTableColumn } from "@/engines/list-view"
import type { EntityTypeListRow } from "@builders/domain"

export const ENTITY_TYPES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<EntityTypeListRow>
> = [
  { key: "entityTypeNumber", label: "ET #" },
  { key: "type", label: "Type" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
