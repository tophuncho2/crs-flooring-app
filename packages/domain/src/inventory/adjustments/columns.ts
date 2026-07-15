import type { ColumnCatalogEntry } from "../../shared/csv.js"
import { formatEasternDateTime } from "../../shared/date-format.js"
import { formatAdjustmentTransition, formatSignedAdjustmentQuantity } from "../formatters.js"
import type { EnrichedInventoryAdjustmentRow } from "./types.js"

/**
 * The adjustments-ledger column catalog — the single source of truth for BOTH the
 * visible list `DataTable` columns and the export (column-picker checkboxes + CSV/
 * Sheet). Order here is the visual left-to-right table order, and the export
 * follows it. Every column shows on both surfaces today (no flags).
 *
 * Cost/freight are absent everywhere — hidden from every adjustments surface, so
 * they're simply not in the catalog. Timestamps render Eastern wall-clock to match
 * the list; nullable columns surface as "" (machine-friendly) rather than the
 * list's "-" placeholder.
 */
export const ADJUSTMENTS_COLUMNS: ReadonlyArray<ColumnCatalogEntry<EnrichedInventoryAdjustmentRow>> = [
  {
    key: "quantity",
    label: "Quantity",
    value: (row) =>
      formatSignedAdjustmentQuantity(row.quantity, row.adjustmentType, row.unitAbbrev ?? ""),
  },
  { key: "converted", label: "Converted", value: (row) => row.convertedBalance ?? "" },
  {
    key: "adjustment",
    label: "Adjustment",
    value: (row) => formatAdjustmentTransition(row.before, row.after, row.unitAbbrev ?? "") ?? "",
  },
  { key: "productName", label: "Product", value: (row) => row.productName },
  { key: "rollNumber", label: "Roll #", value: (row) => row.rollNumber ?? "" },
  { key: "dyeLot", label: "Dye Lot", value: (row) => row.dyeLot ?? "" },
  { key: "inventoryNumber", label: "Inv #", value: (row) => row.inventoryNumber ?? "" },
  { key: "inventoryNote", label: "Note", value: (row) => row.inventoryNote ?? "" },
  { key: "location", label: "Location", value: (row) => row.location ?? "" },
  { key: "isWaste", label: "Waste", value: (row) => (row.isWaste ? "Waste" : "") },
  { key: "area", label: "Area", value: (row) => row.area ?? "" },
  { key: "workOrderNumber", label: "WO #", value: (row) => row.workOrderNumber ?? "" },
  { key: "warehouseName", label: "Warehouse", value: (row) => row.warehouseName },
  { key: "adjustmentNumber", label: "Adjustment #", value: (row) => row.adjustmentNumber },
  {
    key: "adjustmentType",
    label: "Type",
    value: (row) => (row.adjustmentType === "INCREASE" ? "Increase" : "Deduction"),
  },
  { key: "createdAt", label: "Created", value: (row) => formatEasternDateTime(row.createdAt) },
  { key: "updatedAt", label: "Updated", value: (row) => formatEasternDateTime(row.updatedAt) },
  { key: "createdBy", label: "Created by", value: (row) => row.createdBy ?? "" },
  { key: "updatedBy", label: "Updated by", value: (row) => row.updatedBy ?? "" },
]
