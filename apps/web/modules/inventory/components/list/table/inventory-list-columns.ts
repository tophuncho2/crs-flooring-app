import type { DataTableColumn } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"

/**
 * Column definitions for the inventory list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const INVENTORY_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  // Sortable headers (server-side): Stock (quantity), Location, Created. Row#
  // (`inventoryNumber`) is intentionally NOT sortable — `createdAt` is the
  // canonical chronological key.
  { key: "stockBalance", label: "Stock", align: "start", sortable: true },
  { key: "netDeducted", label: "Deducted", align: "end" },
  { key: "startingStock", label: "Starting", align: "end" },
  { key: "productName", label: "Product" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "note", label: "Note" },
  { key: "location", label: "Location", sortable: true },
  { key: "warehouse", label: "Warehouse" },
  { key: "categoryName", label: "Category" },
  { key: "purchaseOrderNumber", label: "PO #" },
  { key: "importNumber", label: "Import #" },
  { key: "cost", label: "Cost", align: "end" },
  { key: "freight", label: "Freight", align: "end" },
  { key: "createdAt", label: "Created", sortable: true },
  { key: "updatedAt", label: "Updated" },
]

/**
 * Columns offered by the gutter Sort menu — keyed by backend sort field (which
 * matches the DataTable column key for inventory), labelled to match the headers.
 * Single source of truth shared by the list client and the reference-header
 * picker grid so the two menus never drift.
 */
export const INVENTORY_SORT_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "createdAt", label: "Created" },
  { key: "location", label: "Location" },
  { key: "stockBalance", label: "Stock" },
]

/** Max simultaneous sort columns — mirrors the API + use case. */
export const INVENTORY_MAX_SORT_LEVELS = 3
