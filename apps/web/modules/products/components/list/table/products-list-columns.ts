import type { DataTableColumn } from "@/engines/list-view"
import type { ProductListRow } from "@builders/domain"

export const PRODUCTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ProductListRow>> = [
  { key: "category", label: "Category" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "note", label: "Note" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "name", label: "Product" },
  { key: "stockUnit", label: "Stock Unit" },
  { key: "sendUnit", label: "Send Unit" },
  { key: "coveragePerUnit", label: "Coverage / Unit", align: "end" },
  { key: "createdAt", label: "Created" },
]
