import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"

/**
 * Column definitions for the inventory list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  // Sortable headers (server-side): Stock (quantity), Product, Location,
  // Warehouse, Created, Updated. Row# (`inventoryNumber`) is intentionally NOT
  // sortable — `createdAt` is the canonical chronological key. Column keys equal
  // their backend sort field (no translation map needed).
  { key: "stockBalance", label: "Stock", align: "start", sortable: true },
  { key: "netDeducted", label: "Deducted", align: "end" },
  { key: "startingStock", label: "Starting", align: "end" },
  { key: "productName", label: "Product", sortable: true },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "note", label: "Note" },
  { key: "location", label: "Location", sortable: true },
  { key: "warehouse", label: "Warehouse", sortable: true },
  { key: "categoryName", label: "Category" },
  { key: "purchaseOrderNumber", label: "PO #" },
  { key: "importNumber", label: "Import #" },
  { key: "cost", label: "Cost", align: "end" },
  { key: "freight", label: "Freight", align: "end" },
  { key: "createdAt", label: "Created", sortable: true },
  { key: "updatedAt", label: "Updated", sortable: true },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

/**
 * Columns offered by the gutter Sort menu — keyed by backend sort field (which
 * matches the DataTable column key for inventory), labelled to match the headers.
 * Single source of truth shared by the list client and the reference-header
 * picker grid so the two menus never drift.
 */
export const INVENTORY_SORT_OPTIONS: ReadonlyArray<SortMenuOption> = [
  { key: "stockBalance", label: "Stock", type: "number" },
  { key: "productName", label: "Product", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "warehouse", label: "Warehouse", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
]

/**
 * Backend sort fields the menu + header carets may emit, derived from the menu
 * options so the allowlist and the menu can never drift. Column keys equal the
 * backend field for inventory (no translation map).
 */
export const INVENTORY_ALLOWED_SORT_FIELDS = INVENTORY_SORT_OPTIONS.map((option) => option.key)

/** Max simultaneous sort columns — mirrors the API + use case. */
export const INVENTORY_MAX_SORT_LEVELS = 3
