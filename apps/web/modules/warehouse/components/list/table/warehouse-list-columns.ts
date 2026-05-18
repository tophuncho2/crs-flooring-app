import type { DataTableColumn } from "@/components/data-table"
import type { WarehouseRecord } from "@builders/db"

export const WAREHOUSE_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WarehouseRecord>> = [
  { key: "name", label: "Warehouse" },
  { key: "streetAddress", label: "Street Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "Postal Code" },
  { key: "phone", label: "Store Phone" },
  { key: "workOrdersCount", label: "Work Orders", align: "end" },
  { key: "number", label: "#", align: "end" },
]
