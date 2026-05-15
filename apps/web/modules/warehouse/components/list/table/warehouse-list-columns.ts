import type { DataTableColumn } from "@/components/data-table"
import type { WarehouseRecord } from "@builders/db"

export const WAREHOUSE_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WarehouseRecord>> = [
  { key: "number", label: "#", align: "end" },
  { key: "name", label: "Warehouse" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Store Phone" },
  { key: "workOrdersCount", label: "Work Orders", align: "end" },
]
