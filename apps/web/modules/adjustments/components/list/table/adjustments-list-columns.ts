import type { DataTableColumn } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Column definitions for the adjustments ledger `DataTable`. Order is the visual
 * left-to-right order. Waste is shown as a data column (the ledger surfaces it)
 * but is not filterable — warehouse is the only toolbar filter.
 */
export const ADJUSTMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<EnrichedInventoryAdjustmentRow>> = [
  { key: "quantity", label: "Quantity", align: "end" },
  { key: "cost", label: "Cost", align: "end" },
  { key: "freight", label: "Freight", align: "end" },
  { key: "adjustment", label: "Adjustment" },
  { key: "productName", label: "Product" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "inventoryNote", label: "Note" },
  { key: "location", label: "Location" },
  { key: "isWaste", label: "Waste" },
  { key: "workOrderNumber", label: "WO #" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "adjustmentNumber", label: "Adjustment #" },
  { key: "adjustmentType", label: "Type" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
