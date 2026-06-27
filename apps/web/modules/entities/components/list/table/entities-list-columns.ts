import type { DataTableColumn } from "@/engines/list-view"
import type { EntityListRow } from "@builders/domain"

/**
 * Column definitions for the entities list-view `DataTable`.
 * Order is the visual left-to-right order. Track widths are computed by
 * the browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const ENTITIES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<EntityListRow>
> = [
  { key: "types", label: "Type(s)" },
  { key: "entity", label: "Entity" },
  { key: "streetAddress", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "propertyCount", label: "Properties", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
