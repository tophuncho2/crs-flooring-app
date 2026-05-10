import {
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { listInventoryForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type InventoryListFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  /**
   * Free-text location filter chip. Server-side ILIKE on `inventory.location`.
   * Independent from the search bar (which targets `inventoryItem`).
   */
  location?: string
  /**
   * `true` = show only archived, `false` = hide archived (default behavior in
   * the data layer when undefined). Modules-sweep filter chip wires this
   * straight through.
   */
  isArchived?: boolean
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
  const categoryId = normalizeIds(input.filters?.categoryId)
  const productId = normalizeIds(input.filters?.productId)
  const location = input.filters?.location?.trim() || undefined
  const isArchived = input.filters?.isArchived

  const filters =
    warehouseId || categoryId || productId || location || isArchived !== undefined
      ? {
          ...(warehouseId ? { warehouseId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(productId ? { productId } : {}),
          ...(location ? { location } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
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
