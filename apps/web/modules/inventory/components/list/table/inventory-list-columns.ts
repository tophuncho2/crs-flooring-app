import type { DataTableCellAlign, DataTableColumn, SortMenuOption } from "@/engines/list-view"
import { INVENTORY_COLUMNS, type InventoryRow } from "@builders/domain"
import { PRODUCT_SORT_OPTIONS_FRAGMENT } from "@/modules/products/components/list/product-sort-options"

/**
 * Per-column alignment overrides for the inventory list `DataTable`, keyed by the
 * catalog column key. Anything absent left-aligns (the default). Kept module-local
 * because alignment is a view concern the pure domain catalog doesn't carry.
 */
const INVENTORY_COLUMN_ALIGN: Record<string, DataTableCellAlign> = {
  stockBalance: "start",
  converted: "start",
  netDeducted: "end",
  startingStock: "end",
}

/**
 * Column definitions for the inventory list-view `DataTable`, derived from the one
 * {@link INVENTORY_COLUMNS} catalog (every non-`exportOnly` entry) so the table and
 * the export can never drift. Order is the visual left-to-right order. Track widths
 * are computed by the browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps. Sorting is driven by the
 * toolbar Sort menu (see INVENTORY_SORT_OPTIONS), not the header — headers are
 * static labels.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> =
  INVENTORY_COLUMNS.filter((column) => !column.exportOnly).map((column) => ({
    key: column.key,
    label: column.label,
    ...(INVENTORY_COLUMN_ALIGN[column.key] ? { align: INVENTORY_COLUMN_ALIGN[column.key] } : {}),
  }))

/**
 * Columns offered by the gutter Sort menu — keyed by backend sort field (which
 * matches the DataTable column key for inventory), labelled to match the headers.
 * Single source of truth shared by the list client and the reference-header
 * picker grid so the two menus never drift.
 */
export const INVENTORY_SORT_OPTIONS: ReadonlyArray<SortMenuOption> = [
  { key: "stockBalance", label: "Stock", type: "number" },
  { key: "productName", label: "Product", type: "text" },
  ...PRODUCT_SORT_OPTIONS_FRAGMENT,
  { key: "location", label: "Location", type: "text" },
  { key: "warehouse", label: "Warehouse", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
]

/**
 * Backend sort fields the Sort menu may emit, derived from the menu options so
 * the allowlist and the menu can never drift.
 */
export const INVENTORY_ALLOWED_SORT_FIELDS = INVENTORY_SORT_OPTIONS.map((option) => option.key)

/** Max simultaneous sort columns — mirrors the API + use case. */
export const INVENTORY_MAX_SORT_LEVELS = 3
