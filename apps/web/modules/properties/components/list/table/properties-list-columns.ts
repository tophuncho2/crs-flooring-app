import type { DataTableColumn } from "@/engines/list-view"
import type { PropertyListRow } from "@builders/domain"

/**
 * Column definitions for the properties list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const PROPERTIES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<PropertyListRow>> = [
  { key: "name", label: "Property" },
  { key: "propertyNumber", label: "PROP #" },
  { key: "managementCompany", label: "Management Company" },
  { key: "streetAddress", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "templateCount", label: "Templates", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
