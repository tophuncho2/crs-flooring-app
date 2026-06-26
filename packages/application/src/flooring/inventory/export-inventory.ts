import { normalizeIdFilter, resolveExportRowCap, type InventoryRow } from "@builders/domain"
import { exportInventoryForListView } from "@builders/db"
import type { ListSort } from "../../list-view/contracts.js"
import {
  resolveInventoryListFilters,
  resolveInventoryListSort,
  type InventoryListFilters,
} from "./list-inventory-input.js"

export type InventoryExportInput = {
  filters?: InventoryListFilters
  sort?: ListSort
  sorts?: ListSort[]
  /** Ticked row ids — when present, scopes the export to exactly these rows. */
  ids?: ReadonlyArray<string>
  /** Requested row cap (`number` or `"all"`); clamped to the hard ceiling. */
  cap?: number | "all"
}

export type InventoryExportResult = {
  rows: InventoryRow[]
  /** Total rows matching the scope, before the cap — lets the route flag truncation. */
  total: number
}

/**
 * Resolve the inventory CSV export: same filter/sort normalization as the list
 * read (shared helper, no use-case cross-import), plus an optional ticked-id
 * scope, capped at the resolved row ceiling. Returns the rows and the full
 * match `total` so the route can report "first N of M".
 */
export async function exportInventoryUseCase(
  input: InventoryExportInput,
): Promise<InventoryExportResult> {
  const take = resolveExportRowCap(input.cap)
  const baseFilters = resolveInventoryListFilters(input.filters)
  const ids = normalizeIdFilter(input.ids)
  const filters = ids ? { ...(baseFilters ?? {}), id: ids } : baseFilters
  const sort = resolveInventoryListSort(input)

  const { rows, total } = await exportInventoryForListView({
    ...(filters ? { filters } : {}),
    ...(sort ? { sort } : {}),
    take,
  })

  return { rows, total }
}
