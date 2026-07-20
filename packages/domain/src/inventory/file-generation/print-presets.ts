import {
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_CELL_FIELDS,
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

// Every available column starts VISIBLE by default — the user unticks what they
// don't want. (cost/freight are already excluded from the manifests upstream.)
// Union the CSV field manifest with the roll-tag print cells so the print-only
// keys (productStyle / productColor) are seeded on too — both surfaces read this
// one `inventoryColumns` map.
function buildInventoryColumnVisibility(): InventoryColumnVisibility {
  return Object.fromEntries(
    [...INVENTORY_PRINT_FIELD_COLUMNS, ...INVENTORY_PRINT_CELL_FIELDS].map((column) => [
      column.key,
      true,
    ]),
  )
}

function buildAdjustmentColumnVisibility(): AdjustmentColumnVisibility {
  return Object.fromEntries(INVENTORY_PRINT_ADJUSTMENT_COLUMNS.map((column) => [column.key, true]))
}

/** Build a fresh, fully-mutable config with the default column selections. */
export function buildInventoryPrintConfig(): InventoryPrintConfig {
  return {
    documentLabel: INVENTORY_DOCUMENT_LABEL,
    inventoryColumns: buildInventoryColumnVisibility(),
    adjustmentColumns: buildAdjustmentColumnVisibility(),
  }
}
