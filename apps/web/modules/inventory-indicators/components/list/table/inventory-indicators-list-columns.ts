import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { InventoryIndicatorRow } from "@builders/domain"

/**
 * Column definitions for the inventory-indicators `DataTable`. Order is the
 * visual left-to-right order. `status` leads with the colored stock-level chip.
 */
export const INDICATORS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InventoryIndicatorRow>> = [
  { key: "status", label: "Status" },
  { key: "productName", label: "Product" },
  { key: "lowStockThreshold", label: "Low Threshold", align: "end" },
  { key: "unit", label: "Unit" },
  { key: "currentStock", label: "On Hand", align: "end" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "isActive", label: "Active" },
  { key: "indicatorNumber", label: "Indicator #" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

/** Columns offered by the toolbar Sort menu — keyed by backend sort field. */
export const INDICATORS_SORT_OPTIONS: ReadonlyArray<SortMenuOption> = [
  { key: "productName", label: "Product", type: "text" },
  { key: "warehouseName", label: "Warehouse", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
]

export const INDICATORS_ALLOWED_SORT_FIELDS = INDICATORS_SORT_OPTIONS.map((option) => option.key)

/** Max simultaneous sort columns — mirrors the API + use case. */
export const INDICATORS_MAX_SORT_LEVELS = 3
