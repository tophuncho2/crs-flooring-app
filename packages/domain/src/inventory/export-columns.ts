import type { ExportColumn } from "../shared/csv.js"
import { toExportColumns } from "../shared/csv.js"
import { INVENTORY_COLUMNS } from "./columns.js"
import type { InventoryRow } from "./types.js"

/**
 * The CSV/Sheet export manifest for inventory list rows — derived from the one
 * {@link INVENTORY_COLUMNS} catalog (every non-`listOnly` entry) so the export can
 * never drift from the visible table. Still the single source consumed two ways:
 * the client column-picker checkboxes read `{ key, label }`; the server serializes
 * through `value`.
 */
export const INVENTORY_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<InventoryRow>> =
  toExportColumns(INVENTORY_COLUMNS)
