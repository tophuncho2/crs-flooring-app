import {
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_FIELD_COLUMNS,
  type AdjustmentColumnVisibility,
  type InventoryColumnVisibility,
  type InventoryPrintConfig,
} from "./types.js"

/**
 * The named starting points for the inventory print configurator. Each seeds the
 * SAME configurable document; the user then toggles columns/rows on top. Roll tag
 * is intentionally NOT a preset here — it needs its own page size + a stripped
 * style/color/roll# layout, so it will ship as its own list-page print surface.
 *
 *   - inventoryItem                — the inventory record only (no adjustments)
 *   - inventoryItemAndAdjustments  — the inventory record + its adjustments ledger
 */
export type InventoryPrintPreset = "inventoryItem" | "inventoryItemAndAdjustments"

/**
 * The centered top-section labels the configurator's document-type selector offers,
 * in order. Unlike the work-order selector (label-only), switching the inventory
 * label ALSO toggles the adjustments section — the labels describe content. See
 * {@link applyInventoryDocumentLabel}.
 */
export const INVENTORY_DOCUMENT_LABELS = ["Inventory Item", "Inventory Item & Adjustments"] as const

export type InventoryDocumentLabel = (typeof INVENTORY_DOCUMENT_LABELS)[number]

const LABEL_TO_PRESET: Record<InventoryDocumentLabel, InventoryPrintPreset> = {
  "Inventory Item": "inventoryItem",
  "Inventory Item & Adjustments": "inventoryItemAndAdjustments",
}

/**
 * Inventory columns visible by default (others start unchecked). Keys reference
 * `INVENTORY_EXPORT_COLUMNS`; cost/freight/PO/import/timestamps default off.
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

/** Adjustment columns visible by default on the ledger table. */
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

/** Build a fresh, fully-mutable config seeded from `preset`. */
export function buildInventoryPrintConfig(preset: InventoryPrintPreset): InventoryPrintConfig {
  const withAdjustments = preset === "inventoryItemAndAdjustments"
  return {
    documentLabel: withAdjustments ? "Inventory Item & Adjustments" : "Inventory Item",
    sections: { adjustments: withAdjustments },
    inventoryColumns: buildInventoryColumnVisibility(),
    adjustmentColumns: buildAdjustmentColumnVisibility(),
  }
}

/**
 * Apply a document-label switch: set the centered title AND toggle the adjustments
 * section to match the label (the two labels describe content). Column selections
 * and selected rows are preserved so the user's fine-tuning survives the switch.
 */
export function applyInventoryDocumentLabel(
  config: InventoryPrintConfig,
  label: InventoryDocumentLabel,
): InventoryPrintConfig {
  const withAdjustments = LABEL_TO_PRESET[label] === "inventoryItemAndAdjustments"
  return {
    ...config,
    documentLabel: label,
    sections: { ...config.sections, adjustments: withAdjustments },
  }
}
