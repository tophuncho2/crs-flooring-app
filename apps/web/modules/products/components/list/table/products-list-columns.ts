import type { DataTableColumn } from "@/components/data-table"
import type { ProductListRow } from "@builders/domain"

export const PRODUCTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ProductListRow>> = [
  { key: "category", label: "Category" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "note", label: "Note" },
  { key: "coverage", label: "Coverage", align: "end" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "name", label: "Product" },
  { key: "stockUnit", label: "Stock Unit" },
  { key: "sendUnit", label: "Send Unit" },
  { key: "itemCoverageUnit", label: "Item Coverage Unit" },
  { key: "createdAt", label: "Created" },
]
