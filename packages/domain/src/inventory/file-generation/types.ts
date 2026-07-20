import type { ExportColumn } from "../../shared/csv.js"
import { formatEasternDate } from "../../shared/date-format.js"
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
 * Fields excluded from the inventory print/CSV surfaces:
 *   - `inventoryNumber` — Inv # is the header's top-right id, always shown.
 *   - `cost` / `freight` — intentionally kept off this document (mirrors the
 *     adjustments manifest, which already omits them).
 *   - `converted` / `convertedUnit` — the derived converted balance is a list-view
 *     CSV column only; kept off the per-record print/CSV document.
 */
const EXCLUDED_INVENTORY_FIELD_KEYS = new Set<string>([
  "inventoryNumber",
  "cost",
  "freight",
  "converted",
  "convertedUnit",
  // Actor emails now ride the list export (visible ⇒ exported), but the per-record
  // print/CSV document stays as it was — they add nothing on a single record.
  "createdBy",
  "updatedBy",
])

/**
 * Inventory fields offered on the print primary block — the inventory CSV manifest
 * minus {@link EXCLUDED_INVENTORY_FIELD_KEYS}. Single source for the primary-block
 * renderer, the CSV builder, and the configurator's checkbox list.
 */
export const INVENTORY_PRINT_FIELD_COLUMNS: ReadonlyArray<ExportColumn<InventoryRow>> =
  INVENTORY_EXPORT_COLUMNS.filter((column) => !EXCLUDED_INVENTORY_FIELD_KEYS.has(column.key))

/**
 * The roll-tag print's primary-block cells — the small label/value grid shown
 * under the big Roll# heading. A FIXED four-field set (Style, Color, Starting
 * Stock, Created Date), NOT the full CSV manifest: the roll tag is a purpose-built
 * physical document, not a record dump. Each cell is gated by the SAME
 * `inventoryColumns` visibility map the CSV field block reads (single-source
 * contract — the configurator checkbox and the rendered cell share a key), so
 * `startingStock` / `createdAt` (also CSV manifest keys) reuse their checkbox and
 * `productStyle` / `productColor` are seeded on in the print config.
 */
export const INVENTORY_PRINT_CELL_FIELDS: ReadonlyArray<ExportColumn<InventoryRow>> = [
  { key: "productStyle", label: "Style", value: (row) => row.productStyle ?? "" },
  { key: "productColor", label: "Color", value: (row) => row.productColor ?? "" },
  { key: "startingStock", label: "Starting Stock", value: (row) => row.startingStock },
  { key: "createdAt", label: "Created Date", value: (row) => formatEasternDate(row.createdAt) },
]

/**
 * How many blank rows the printed write-in grid (Date · Adjustment · Balance)
 * carries. The grid prints EMPTY — the operator hand-writes cut entries onto the
 * physical tag — so this is purely a layout constant sized to one letter page.
 */
export const INVENTORY_PRINT_LEDGER_ROW_COUNT = 15

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
