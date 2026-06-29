import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"

/**
 * Column definitions for the inventory list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  // Sorting is driven by the toolbar Sort menu (see INVENTORY_SORT_OPTIONS), not
  // the column header — headers are static labels.
  { key: "stockBalance", label: "Stock", align: "start" },
  { key: "netDeducted", label: "Deducted", align: "end" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "note", label: "Note" },
  { key: "location", label: "Location" },
  { key: "warehouse", label: "Warehouse" },
  { key: "purchaseOrderNumber", label: "PO #" },
  { key: "importNumber", label: "Import #" },
  { key: "startingStock", label: "Starting", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
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
 * Backend sort fields the Sort menu may emit, derived from the menu options so
 * the allowlist and the menu can never drift.
 */
export const INVENTORY_ALLOWED_SORT_FIELDS = INVENTORY_SORT_OPTIONS.map((option) => option.key)

/** Max simultaneous sort columns — mirrors the API + use case. */
export const INVENTORY_MAX_SORT_LEVELS = 3
