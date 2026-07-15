import type { DataTableCellAlign, DataTableColumn, SortMenuOption } from "@/engines/list-view"
import { ADJUSTMENTS_COLUMNS, type EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Per-column alignment overrides for the adjustments ledger `DataTable`, keyed by
 * the catalog column key. Anything absent left-aligns (the default). Kept
 * module-local because alignment is a view concern the pure domain catalog doesn't
 * carry.
 */
const ADJUSTMENTS_COLUMN_ALIGN: Record<string, DataTableCellAlign> = {
  quantity: "end",
  converted: "end",
}

/**
 * Column definitions for the adjustments ledger `DataTable`, derived from the one
 * {@link ADJUSTMENTS_COLUMNS} catalog (every non-`exportOnly` entry) so the table
 * and the export can never drift. Order is the visual left-to-right order. Waste is
 * shown as a data column (the ledger surfaces it) but is not filterable — warehouse
 * is the only toolbar filter.
 */
export const ADJUSTMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<EnrichedInventoryAdjustmentRow>> =
  ADJUSTMENTS_COLUMNS.filter((column) => !column.exportOnly).map((column) => ({
    key: column.key,
    label: column.label,
    ...(ADJUSTMENTS_COLUMN_ALIGN[column.key] ? { align: ADJUSTMENTS_COLUMN_ALIGN[column.key] } : {}),
  }))

/**
 * Columns offered by the toolbar Sort menu — keyed by backend sort field (which
 * matches the DataTable column key), labelled to match the headers. `productName`
 * resolves to the live `product.name` relation server-side. Single source of
 * truth: the client allowlist is derived from these keys so the two never drift.
 */
export const ADJUSTMENTS_SORT_OPTIONS: ReadonlyArray<SortMenuOption> = [
  { key: "productName", label: "Product", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
]

/**
 * Backend sort fields the Sort menu may emit, derived from the menu options so
 * the allowlist and the menu can never drift.
 */
export const ADJUSTMENTS_ALLOWED_SORT_FIELDS = ADJUSTMENTS_SORT_OPTIONS.map((option) => option.key)

/** Max simultaneous sort columns — mirrors the API + use case. */
export const ADJUSTMENTS_MAX_SORT_LEVELS = 3
