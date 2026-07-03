import type { ExportColumn } from "../../../shared/csv.js"
import { formatEasternDateTime } from "../../../shared/date-format.js"
import {
  formatAdjustmentTransition,
  formatSignedAdjustmentQuantity,
} from "../formatters.js"
import type { EnrichedInventoryAdjustmentRow } from "./types.js"

/**
 * The CSV export manifest for the adjustments ledger list — the single source of
 * truth for both the client column-picker checkboxes (`{ key, label }`) and the
 * server-side serialization (`value`). Mirrors the visible list columns
 * (`adjustments-row-cell.tsx`): signed quantity, the before→after transition,
 * the live product label, identity snapshots, actor emails, and timestamps.
 *
 * Cost/freight are intentionally excluded — they are hidden from every
 * adjustments list/record/form surface, so the export mirrors what's on screen.
 * Timestamps render Eastern wall-clock to match the list. Nullable columns
 * surface as "" rather than the list's "-" placeholder (machine-friendly).
 */
export const ADJUSTMENTS_EXPORT_COLUMNS: ReadonlyArray<
  ExportColumn<EnrichedInventoryAdjustmentRow>
> = [
  {
    key: "quantity",
    label: "Quantity",
    value: (row) =>
      formatSignedAdjustmentQuantity(row.quantity, row.adjustmentType, row.unitAbbrev ?? ""),
  },
  {
    key: "adjustment",
    label: "Adjustment",
    value: (row) =>
      formatAdjustmentTransition(row.before, row.after, row.unitAbbrev ?? "") ?? "",
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
