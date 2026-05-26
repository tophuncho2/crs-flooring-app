import type { DataTableColumn } from "@/components/data-table"
import type { InventoryCutLogRow } from "@builders/domain"

/**
 * Column definitions for the cut-logs ledger `DataTable`. Order is the visual
 * left-to-right order. Status + Waste are shown as data columns (the ledger
 * surfaces them) but are not filterable — warehouse is the only toolbar filter.
 */
export const CUT_LOGS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryCutLogRow>> = [
  { key: "cutLogNumber", label: "Cut Log #" },
  { key: "status", label: "Status" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "cut", label: "Cut", align: "end" },
  { key: "isWaste", label: "Waste" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "workOrderNumber", label: "WO #" },
  { key: "createdAt", label: "Created" },
]
