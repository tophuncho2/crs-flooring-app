import type { CategoryListRow } from "./types.js"

type CategoryListRowInput = {
  id: string
  name: string
}

export function normalizeCategoryListRow(category: CategoryListRowInput): CategoryListRow {
  return {
    id: category.id,
    name: category.name,
  }
}
