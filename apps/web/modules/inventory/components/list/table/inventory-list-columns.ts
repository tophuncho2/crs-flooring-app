import type { DataTableColumn } from "@/components/data-table"
import type { InventoryRow } from "@builders/domain"

/**
 * Column definitions for the inventory list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  { key: "stockBalance", label: "Stock", align: "start" },
  { key: "totalCutSum", label: "Cut", align: "end" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "location", label: "Location" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "note", label: "Note" },
  { key: "coverageBalance", label: "Coverage", align: "end" },
  { key: "coveragePerUnit", label: "Per Unit", align: "end" },
  { key: "warehouse", label: "Warehouse" },
  { key: "fifoReceivedAt", label: "FIFO Received" },
  { key: "updatedAt", label: "Updated" },
]
