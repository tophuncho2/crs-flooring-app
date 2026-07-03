import type { DataTableColumn } from "@/engines/list-view"
import type { CategoryListRow } from "@builders/domain"

export const CATEGORIES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<CategoryListRow>
> = [
  { key: "name", label: "Category" },
]
