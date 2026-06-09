import type { DataTableColumn } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Column definitions for the adjustments ledger `DataTable`. Order is the visual
 * left-to-right order. Status + Waste are shown as data columns (the ledger
 * surfaces them) but are not filterable — warehouse is the only toolbar filter.
 */
export const ADJUSTMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<EnrichedInventoryAdjustmentRow>> = [
  { key: "status", label: "Status" },
  { key: "quantity", label: "Quantity", align: "end" },
  { key: "adjustment", label: "Adjustment" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "inventoryNote", label: "Note" },
  { key: "location", label: "Location" },
  { key: "isWaste", label: "Waste" },
  { key: "finalSequence", label: "Final Seq #", align: "end" },
  { key: "notes", label: "Notes" },
  { key: "adjustmentNumber", label: "Adjustment #" },
  { key: "adjustmentType", label: "Type" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "workOrderNumber", label: "WO #" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
