import {
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { listInventoryForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type InventoryListFilters = {
  warehouseId?: ReadonlyArray<string>
  sectionId?: ReadonlyArray<string>
  locationId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
}

function normalizeIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listInventoryUseCase(
  input: ListInput<InventoryListFilters>,
): Promise<ListOutput<InventoryRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_INVENTORY_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_INVENTORY_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined

  const warehouseId = normalizeIds(input.filters?.warehouseId)
  const sectionId = normalizeIds(input.filters?.sectionId)
  const locationId = normalizeIds(input.filters?.locationId)
  const categoryId = normalizeIds(input.filters?.categoryId)
  const productId = normalizeIds(input.filters?.productId)

  const filters =
    warehouseId || sectionId || locationId || categoryId || productId
      ? {
          ...(warehouseId ? { warehouseId } : {}),
          ...(sectionId ? { sectionId } : {}),
          ...(locationId ? { locationId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(productId ? { productId } : {}),
        }
      : undefined

  const { rows, total } = await listInventoryForListView({
    search,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
