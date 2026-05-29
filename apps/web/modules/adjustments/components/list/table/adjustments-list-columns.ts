import type { DataTableColumn } from "@/components/data-table"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Column definitions for the adjustments ledger `DataTable`. Order is the visual
 * left-to-right order. Status + Waste are shown as data columns (the ledger
 * surfaces them) but are not filterable — warehouse is the only toolbar filter.
 */
export const ADJUSTMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<EnrichedInventoryAdjustmentRow>> = [
  { key: "adjustmentNumber", label: "Adjustment #" },
  { key: "status", label: "Status" },
  { key: "adjustmentType", label: "Type" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "inventoryNote", label: "Note" },
  { key: "quantity", label: "Amount", align: "end" },
  { key: "coverage", label: "Coverage", align: "end" },
  { key: "isWaste", label: "Waste" },
  { key: "finalSequence", label: "Final Seq #", align: "end" },
  { key: "notes", label: "Notes" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "workOrderNumber", label: "WO #" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
