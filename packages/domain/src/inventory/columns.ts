import type { ColumnCatalogEntry } from "../shared/csv.js"
import { formatEasternDateTime } from "../shared/date-format.js"
import { composeRollNumberDisplay } from "./formatters.js"
import type { InventoryRow } from "./types.js"

/**
 * The inventory column catalog — the single source of truth for BOTH the visible
 * list-view `DataTable` columns and the export (column-picker checkboxes + CSV/
 * Sheet). Order here is the visual left-to-right table order, and the export
 * follows it. A plain entry shows in both surfaces; `exportOnly` entries are the
 * machine-friendly raw decimal/unit columns the table folds into formatted cells.
 *
 * The client derives `INVENTORY_LIST_COLUMNS` from the `!exportOnly` entries; the
 * domain derives `INVENTORY_EXPORT_COLUMNS` from the `!listOnly` entries. Money
 * and quantity columns stay as raw decimal strings so the file is machine-
 * friendly; timestamps render Eastern wall-clock to match the list.
 */
export const INVENTORY_COLUMNS: ReadonlyArray<ColumnCatalogEntry<InventoryRow>> = [
  { key: "stockBalance", label: "Stock", value: (row) => row.stockBalance },
  { key: "netDeducted", label: "Deducted", value: (row) => row.netDeducted },
  { key: "productName", label: "Product", value: (row) => row.productName },
  { key: "location", label: "Location", value: (row) => row.location },
  {
    key: "rollNumber",
    label: "Roll #",
    value: (row) => composeRollNumberDisplay(row.rollPrefix, row.rollNumber),
  },
  { key: "dyeLot", label: "Dye Lot", value: (row) => row.dyeLot },
  { key: "note", label: "Note", value: (row) => row.note },
  { key: "inventoryNumber", label: "Inv #", value: (row) => row.inventoryNumber },
  { key: "converted", label: "Converted", value: (row) => row.convertedStockBalance ?? "" },
  {
    key: "convertedUnit",
    label: "Converted Unit",
    value: (row) => row.conversionUnitAbbrev ?? "",
    exportOnly: true,
  },
  { key: "warehouseName", label: "Warehouse", value: (row) => row.warehouseName },
  { key: "purchaseOrderNumber", label: "PO #", value: (row) => row.purchaseOrderNumber },
  {
    key: "importNumber",
    label: "Import #",
    value: (row) => (row.importNumber == null ? "" : String(row.importNumber)),
  },
  { key: "startingStock", label: "Starting", value: (row) => row.startingStock },
  { key: "unit", label: "Unit", value: (row) => row.unitAbbrev, exportOnly: true },
  { key: "cost", label: "Cost", value: (row) => row.cost, exportOnly: true },
  { key: "freight", label: "Freight", value: (row) => row.freight, exportOnly: true },
  {
    key: "balanceLastChangedAt",
    label: "Balance Changed",
    value: (row) => (row.balanceLastChangedAt ? formatEasternDateTime(row.balanceLastChangedAt) : ""),
  },
  { key: "createdAt", label: "Created", value: (row) => formatEasternDateTime(row.createdAt) },
  { key: "updatedAt", label: "Updated", value: (row) => formatEasternDateTime(row.updatedAt) },
  { key: "createdBy", label: "Created by", value: (row) => row.createdBy ?? "" },
  { key: "updatedBy", label: "Updated by", value: (row) => row.updatedBy ?? "" },
]
