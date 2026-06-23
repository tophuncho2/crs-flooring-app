import type { DataTableColumn } from "@/engines/list-view"
import type { ProductListRow } from "@builders/domain"

export const PRODUCTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ProductListRow>> = [
  { key: "category", label: "Category" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "productNamingAddon", label: "Naming Add-on" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "name", label: "Product" },
  { key: "coveragePerUnit", label: "Coverage / Unit", align: "end" },
  { key: "stockUnit", label: "Stock Unit" },
  { key: "createdAt", label: "Created" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
