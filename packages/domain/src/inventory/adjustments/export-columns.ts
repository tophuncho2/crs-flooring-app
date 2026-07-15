import type { ExportColumn } from "../../shared/csv.js"
import { toExportColumns } from "../../shared/csv.js"
import { ADJUSTMENTS_COLUMNS } from "./columns.js"
import type { EnrichedInventoryAdjustmentRow } from "./types.js"

/**
 * The CSV/Sheet export manifest for the adjustments ledger — derived from the one
 * {@link ADJUSTMENTS_COLUMNS} catalog (every non-`listOnly` entry) so the export can
 * never drift from the visible list. Still the single source consumed two ways:
 * the client column-picker checkboxes read `{ key, label }`; the server serializes
 * through `value`.
 */
export const ADJUSTMENTS_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<EnrichedInventoryAdjustmentRow>> =
  toExportColumns(ADJUSTMENTS_COLUMNS)
