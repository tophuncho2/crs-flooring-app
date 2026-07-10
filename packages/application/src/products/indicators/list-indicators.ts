import { listIndicatorsForListView } from "@builders/db"
import {
  INVENTORY_INDICATORS_LIST_MAX_PAGE_SIZE,
  INVENTORY_INDICATORS_LIST_PAGE_SIZE,
  type InventoryIndicatorListFilters,
  type InventoryIndicatorRow,
} from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"
import { resolveInventoryListSort } from "../../inventory/list-inventory-input.js"

function normalizeIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

/**
 * Standalone indicators list read powering the nav list view. Read-only — the
 * list has no create; rows open into the parent product record view. The generic
 * inventory sort resolver is reused (identical shape, cap of 3).
 */
export async function listIndicatorsUseCase(
  input: ListInput<InventoryIndicatorListFilters>,
): Promise<ListOutput<InventoryIndicatorRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || INVENTORY_INDICATORS_LIST_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(INVENTORY_INDICATORS_LIST_MAX_PAGE_SIZE, requestedPageSize),
  )

  const warehouseId = normalizeIds(input.filters?.warehouseId)
  const productId = normalizeIds(input.filters?.productId)
  const indicatorNumber = input.filters?.indicatorNumber?.trim() || undefined

  const sort = resolveInventoryListSort(input)

  const { rows, total } = await listIndicatorsForListView({
    filters: {
      ...(warehouseId ? { warehouseId } : {}),
      ...(productId ? { productId } : {}),
      ...(indicatorNumber ? { indicatorNumber } : {}),
    },
    page,
    pageSize,
    ...(sort ? { sort } : {}),
  })

  return { rows, total }
}
