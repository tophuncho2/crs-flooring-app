import {
  LIST_CATEGORIES_MAX_PAGE_SIZE,
  LIST_CATEGORIES_PAGE_SIZE,
  type CategoryListRow,
} from "@builders/domain"
import { listCategoriesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type CategoriesListFilters = Record<string, never>

export async function listCategoriesUseCase(
  input: ListInput<CategoriesListFilters>,
): Promise<ListOutput<CategoryListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_CATEGORIES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_CATEGORIES_MAX_PAGE_SIZE, requestedPageSize))

  const { rows, total } = await listCategoriesForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
