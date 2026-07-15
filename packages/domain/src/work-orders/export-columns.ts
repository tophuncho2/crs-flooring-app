import type { ExportColumn } from "../shared/csv.js"
import { toExportColumns } from "../shared/csv.js"
import { WORK_ORDER_COLUMNS } from "./columns.js"
import type { WorkOrderListRow } from "./types.js"

/**
 * The CSV/Sheet export manifest for work-order list rows — derived from the one
 * {@link WORK_ORDER_COLUMNS} catalog (every non-`listOnly` entry) so the export can
 * never drift from the visible table. Still the single source consumed two ways:
 * the client column-picker checkboxes read `{ key, label }`; the server serializes
 * through `value`.
 */
export const WORK_ORDER_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<WorkOrderListRow>> =
  toExportColumns(WORK_ORDER_COLUMNS)
