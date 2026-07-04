import type { Category, CategoryListRow } from "./types.js"

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

type CategoryDetailInput = {
  id: string
  name: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeCategoryDetail(category: CategoryDetailInput): Category {
  return {
    id: category.id,
    name: category.name,
    createdAt:
      category.createdAt instanceof Date ? category.createdAt.toISOString() : category.createdAt,
    updatedAt:
      category.updatedAt instanceof Date ? category.updatedAt.toISOString() : category.updatedAt,
  }
}
