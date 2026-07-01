import type { DataTableColumn } from "@/engines/list-view"
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
  { key: "unit", label: "Unit" },
  { key: "createdAt", label: "Created" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
