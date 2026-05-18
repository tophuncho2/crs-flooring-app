import type { DataTableColumn } from "@/components/data-table"
import type { ImportRow } from "@builders/domain"

export const IMPORTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ImportRow>> = [
  { key: "importNumber", label: "Import #" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "manufacturerName", label: "Manufacturer" },
  { key: "purchaseOrderNumber", label: "Purchase Order #" },
  { key: "stagedInventoryRowsCount", label: "Staged", align: "end" },
  { key: "liveInventoryRowsCount", label: "Live", align: "end" },
  { key: "createdAt", label: "Created" },
]
