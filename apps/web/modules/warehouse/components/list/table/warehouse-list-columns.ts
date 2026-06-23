import type { DataTableColumn } from "@/engines/list-view"
import type { WarehouseListRow } from "@builders/domain"

export const WAREHOUSE_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WarehouseListRow>> = [
  { key: "warehouseNumber", label: "Store #" },
  { key: "name", label: "Warehouse" },
  { key: "streetAddress", label: "Street Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "Postal Code" },
  { key: "phone", label: "Store Phone" },
  { key: "workOrdersCount", label: "Work Orders", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
