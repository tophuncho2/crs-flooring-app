import {
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_FIELD_COLUMNS,
  type AdjustmentColumnVisibility,
  type InventoryColumnVisibility,
  type InventoryPrintConfig,
} from "./types.js"

/**
 * The centered print title. Inventory has a single document — the record sheet —
 * so this is a static label, not a selector (adjustments are CSV-only and never
 * printed, so there is no "& Adjustments" print variant). Roll tag, when built,
 * will be its own separate small-page print surface.
 */
export const INVENTORY_DOCUMENT_LABEL = "Inventory Item"

/**
 * Inventory columns visible by default (others start unchecked). Keys reference
 * `INVENTORY_EXPORT_COLUMNS`; cost/freight/PO/import/timestamps default off. Drives
 * both the printed record sheet and the CSV record block.
 */
const DEFAULT_INVENTORY_COLUMNS = new Set<string>([
  "productName",
  "rollNumber",
  "dyeLot",
  "warehouseName",
  "location",
  "stockBalance",
  "unit",
])

/** Adjustment columns visible by default in the CSV ledger block (CSV-only). */
const DEFAULT_ADJUSTMENT_COLUMNS = new Set<string>([
  "quantity",
  "adjustment",
  "rollNumber",
  "dyeLot",
  "location",
  "area",
  "workOrderNumber",
])

function buildInventoryColumnVisibility(): InventoryColumnVisibility {
  return Object.fromEntries(
    INVENTORY_PRINT_FIELD_COLUMNS.map((column) => [column.key, DEFAULT_INVENTORY_COLUMNS.has(column.key)]),
  )
}

function buildAdjustmentColumnVisibility(): AdjustmentColumnVisibility {
  return Object.fromEntries(
    INVENTORY_PRINT_ADJUSTMENT_COLUMNS.map((column) => [
      column.key,
      DEFAULT_ADJUSTMENT_COLUMNS.has(column.key),
    ]),
  )
}

/** Build a fresh, fully-mutable config with the default column selections. */
export function buildInventoryPrintConfig(): InventoryPrintConfig {
  return {
    documentLabel: INVENTORY_DOCUMENT_LABEL,
    inventoryColumns: buildInventoryColumnVisibility(),
    adjustmentColumns: buildAdjustmentColumnVisibility(),
  }
}
