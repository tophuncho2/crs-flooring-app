import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

/**
 * Column definitions for the adjustments ledger `DataTable`. Order is the visual
 * left-to-right order. Waste is shown as a data column (the ledger surfaces it)
 * but is not filterable — warehouse is the only toolbar filter.
 */
export const ADJUSTMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<EnrichedInventoryAdjustmentRow>> = [
  { key: "quantity", label: "Quantity", align: "end" },
  { key: "converted", label: "Converted", align: "end" },
  { key: "adjustment", label: "Adjustment" },
  { key: "productName", label: "Product" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye Lot" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "inventoryNote", label: "Note" },
  { key: "location", label: "Location" },
  { key: "isWaste", label: "Waste" },
  { key: "area", label: "Area" },
  { key: "workOrderNumber", label: "WO #" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "adjustmentNumber", label: "Adjustment #" },
  { key: "adjustmentType", label: "Type" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

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
