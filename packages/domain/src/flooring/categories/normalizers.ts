import type { CategoryListRow } from "./types.js"

type CategoryListRowInput = {
  id: string
  name: string
  sendUnit: { name: string } | null
  stockUnit: { name: string } | null
}

export function normalizeCategoryListRow(category: CategoryListRowInput): CategoryListRow {
  return {
    id: category.id,
    name: category.name,
    sendUnit: category.sendUnit?.name ?? "",
    stockUnit: category.stockUnit?.name ?? "",
  }
}
