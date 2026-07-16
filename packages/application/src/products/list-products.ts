import {
  LIST_PRODUCTS_MAX_PAGE_SIZE,
  LIST_PRODUCTS_PAGE_SIZE,
  type ProductListRow,
} from "@builders/domain"
import { listProductsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

export type ProductsListFilters = {
  prodNumber?: string
  color?: string
  style?: string
  namingAddon?: string
  categoryId?: ReadonlyArray<string>
  /** Archive filter. `true` = archived-only; `false`/`undefined` = hide archived. */
  isArchived?: boolean
}

/** Cap on user-selected sort columns — mirrors the engine + request + API. */
const LIST_PRODUCTS_MAX_SORT_LEVELS = 3

function normalizeCategoryIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listProductsUseCase(
  input: ListInput<ProductsListFilters>,
): Promise<ListOutput<ProductListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_PRODUCTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_PRODUCTS_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const prodNumber = input.filters?.prodNumber?.trim() || undefined
  const color = input.filters?.color?.trim() || undefined
  const style = input.filters?.style?.trim() || undefined
  const namingAddon = input.filters?.namingAddon?.trim() || undefined
  const categoryId = normalizeCategoryIds(input.filters?.categoryId)
  const isArchived = input.filters?.isArchived

  const filters =
    prodNumber || color || style || namingAddon || categoryId || isArchived !== undefined
      ? {
          ...(prodNumber ? { prodNumber } : {}),
          ...(color ? { color } : {}),
          ...(style ? { style } : {}),
          ...(namingAddon ? { namingAddon } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
        }
      : undefined

  // Ordered multi-column sort. Cap mirrors the engine + request + API layers;
  // an empty list lets the read-repository fall back to its default order.
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, LIST_PRODUCTS_MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const { rows, total } = await listProductsForListView({
    search,
    filters,
    ...(sort ? { sort } : {}),
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
