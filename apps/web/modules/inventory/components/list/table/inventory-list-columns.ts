import type { DataTableColumn } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"

/**
 * Column definitions for the inventory list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  { key: "stockBalance", label: "Stock", align: "start" },
  { key: "netDeducted", label: "Deducted", align: "end" },
  { key: "startingStock", label: "Starting", align: "end" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "note", label: "Note" },
  { key: "location", label: "Location" },
  { key: "warehouse", label: "Warehouse" },
  { key: "categoryName", label: "Category" },
  { key: "purchaseOrderNumber", label: "PO #" },
  { key: "importNumber", label: "Import #" },
  { key: "cost", label: "Cost", align: "end" },
  { key: "freight", label: "Freight", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
