import type { ExportColumn } from "../../shared/csv.js"
import { INVENTORY_EXPORT_COLUMNS } from "../export-columns.js"
import { ADJUSTMENTS_EXPORT_COLUMNS } from "../adjustments/export-columns.js"
import type { InventoryRow } from "../types.js"
import type { EnrichedInventoryAdjustmentRow } from "../adjustments/types.js"

/**
 * The inventory print/export document types. Mirrors the work-order file-generation
 * package: a single checkbox-driven config drives both the HTML print builder and
 * the CSV builder off the SAME inventory record, so print and CSV never diverge.
 *
 * Reuse note: the checkboxable columns are NOT re-authored here — they ARE the
 * existing list-view CSV manifests (`INVENTORY_EXPORT_COLUMNS` +
 * `ADJUSTMENTS_EXPORT_COLUMNS`), the single source of truth for `{ key, label,
 * value }`. Both the configurator checkboxes and the renderers iterate these.
 */

/**
 * Inventory fields offered on the print primary block — the full inventory CSV
 * manifest MINUS `inventoryNumber` (Inv # is the header's top-right id, always
 * shown, so it is not a togglable field). Single source for the primary-block
 * renderer, the CSV builder, and the configurator's checkbox list.
 */
export const INVENTORY_PRINT_FIELD_COLUMNS: ReadonlyArray<ExportColumn<InventoryRow>> =
  INVENTORY_EXPORT_COLUMNS.filter((column) => column.key !== "inventoryNumber")

/**
 * Adjustment columns offered on the print adjustments table — the full ledger CSV
 * manifest. Product name is included even though every adjustment on one inventory
 * shares the parent product, so the user may still surface it if they want.
 */
export const INVENTORY_PRINT_ADJUSTMENT_COLUMNS: ReadonlyArray<
  ExportColumn<EnrichedInventoryAdjustmentRow>
> = ADJUSTMENTS_EXPORT_COLUMNS

/**
 * Column visibility maps keyed by the CSV manifest keys (`ExportColumn.key` is a
 * plain string, so these are string-keyed lookups rather than literal unions).
 * `true` ⇒ the column renders on both surfaces.
 */
export type InventoryColumnVisibility = Record<string, boolean>
export type AdjustmentColumnVisibility = Record<string, boolean>

/**
 * The full checkbox-driven configuration for ONE inventory export document. Seeded
 * by {@link import("./print-presets.js").buildInventoryPrintConfig} then mutated by
 * the configurator's checkboxes.
 *
 * Two outputs are shaped to their medium:
 *   - PRINT — the inventory record only (a single record always fits a page). The
 *     adjustments ledger is never printed (it would overflow any sheet).
 *   - CSV — the inventory record AND the adjustments ledger (unbounded rows).
 *
 * So `inventoryColumns` drives BOTH surfaces, while `adjustmentColumns` +
 * `selectedAdjustmentIds` are CSV-only. `documentLabel` is the centered print title
 * (static "Inventory Item"). `selectedAdjustmentIds` undefined ⇒ all adjustment rows.
 */
export type InventoryPrintConfig = {
  documentLabel: string
  inventoryColumns: InventoryColumnVisibility
  adjustmentColumns: AdjustmentColumnVisibility
  selectedAdjustmentIds?: ReadonlyArray<string>
}
