import type { DataTableColumn } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"

/**
 * Column definitions for the templates list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const TEMPLATES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<TemplateListRow>> = [
  { key: "templateNumber", label: "Template #" },
  { key: "unitType", label: "Unit Type" },
  { key: "property", label: "Property" },
  { key: "entity", label: "Entity" },
  { key: "jobType", label: "Job Type" },
  { key: "warehouse", label: "Warehouse" },
  { key: "description", label: "Description" },
  { key: "items", label: "Items", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
