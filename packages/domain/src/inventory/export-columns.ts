import type { ExportColumn } from "../shared/csv.js"
import { formatEasternDateTime } from "../shared/date-format.js"
import { composeRollNumberDisplay } from "./formatters.js"
import type { InventoryRow } from "./types.js"

/**
 * The CSV export manifest for inventory list rows — the single source of truth
 * for both the client column-picker checkboxes (`{ key, label }`) and the
 * server-side serialization (`value`). Money and quantity columns stay as raw
 * decimal strings in their own columns (units carried separately) so the file
 * is machine-friendly; timestamps render Eastern wall-clock to match the list.
 */
export const INVENTORY_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<InventoryRow>> = [
  { key: "inventoryNumber", label: "Inv #", value: (row) => row.inventoryNumber },
  { key: "productName", label: "Product", value: (row) => row.productName },
  {
    key: "rollNumber",
    label: "Roll #",
    value: (row) => composeRollNumberDisplay(row.rollPrefix, row.rollNumber),
  },
  { key: "dyeLot", label: "Dye Lot", value: (row) => row.dyeLot },
  { key: "warehouseName", label: "Warehouse", value: (row) => row.warehouseName },
  { key: "location", label: "Location", value: (row) => row.location },
  { key: "stockBalance", label: "Stock", value: (row) => row.stockBalance },
  { key: "converted", label: "Converted", value: (row) => row.convertedStockBalance ?? "" },
  { key: "convertedUnit", label: "Converted Unit", value: (row) => row.conversionUnitAbbrev ?? "" },
  { key: "netDeducted", label: "Deducted", value: (row) => row.netDeducted },
  { key: "startingStock", label: "Starting", value: (row) => row.startingStock },
  { key: "unit", label: "Unit", value: (row) => row.unitAbbrev },
  { key: "cost", label: "Cost", value: (row) => row.cost },
  { key: "freight", label: "Freight", value: (row) => row.freight },
  { key: "purchaseOrderNumber", label: "PO #", value: (row) => row.purchaseOrderNumber },
  {
    key: "importNumber",
    label: "Import #",
    value: (row) => (row.importNumber == null ? "" : String(row.importNumber)),
  },
  { key: "note", label: "Note", value: (row) => row.note },
  { key: "createdAt", label: "Created", value: (row) => formatEasternDateTime(row.createdAt) },
  { key: "updatedAt", label: "Updated", value: (row) => formatEasternDateTime(row.updatedAt) },
]
