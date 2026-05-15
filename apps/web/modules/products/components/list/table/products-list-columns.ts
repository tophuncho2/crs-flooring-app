import type { DataTableColumn } from "@/components/data-table"
import type { ProductListRow } from "@builders/domain"

export const PRODUCTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ProductListRow>> = [
  { key: "category", label: "Category" },
  { key: "name", label: "Product" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "coverage", label: "Coverage", align: "end" },
]
