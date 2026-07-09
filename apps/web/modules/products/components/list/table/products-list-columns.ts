import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { ProductListRow } from "@builders/domain"

export const PRODUCTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ProductListRow>> = [
  { key: "productNumber", label: "PROD #" },
  { key: "category", label: "Category" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "productNamingAddon", label: "Naming Add-on" },
  { key: "entity", label: "Entity" },
  { key: "name", label: "Product" },
  { key: "coveragePerUnit", label: "Coverage / Unit", align: "end" },
  { key: "cost", label: "Cost / Unit", align: "end" },
  { key: "unit", label: "Unit" },
  { key: "createdAt", label: "Created" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

/**
 * Sort tool source of truth. Keys ARE the backend sort fields (menu-only —
 * the DataTable headers above stay static labels). `category` resolves to
 * `category.name` in the order-by builder; `style`/`color` are nullable
 * free-text (nulls sink last). The client allowlist is DERIVED from this so
 * the two can never drift; the two server allowlists mirror these keys.
 */
export const PRODUCTS_SORT_OPTIONS = [
  { key: "category", label: "Category", type: "text" },
  { key: "style", label: "Style", type: "text" },
  { key: "color", label: "Color", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
] as const satisfies ReadonlyArray<SortMenuOption>

export const PRODUCTS_ALLOWED_SORT_FIELDS = PRODUCTS_SORT_OPTIONS.map((o) => o.key)

export const PRODUCTS_MAX_SORT_LEVELS = 3
