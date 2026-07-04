import { normalizeIdFilter, resolveExportRowCap, type WorkOrderListRow } from "@builders/domain"
import { exportWorkOrders } from "@builders/db"
import type { ListSort } from "../../list-view/contracts.js"
import type { WorkOrdersListFilters } from "./list-work-orders.js"

/** Cap on user-selected sort columns (mirrors the list use case + the engine). */
const MAX_SORT_LEVELS = 3

export type WorkOrdersExportInput = {
  filters?: WorkOrdersListFilters
  sort?: ListSort
  sorts?: ListSort[]
  /** Ticked row ids — when present, scopes the export to exactly these rows. */
  ids?: ReadonlyArray<string>
  /** Requested row cap (`number` or `"all"`); clamped to the hard ceiling. */
  cap?: number | "all"
}

export type WorkOrdersExportResult = {
  rows: WorkOrderListRow[]
  /** Total rows matching the scope, before the cap — lets the route flag truncation. */
  total: number
}

/**
 * Resolve the work-order CSV export: filters pass through (as the list read
 * does), plus an optional ticked-id scope, capped at the resolved row ceiling.
 * Returns the rows and the full match `total` so the route can report "first N of M".
 */
export async function exportWorkOrdersUseCase(
  input: WorkOrdersExportInput,
): Promise<WorkOrdersExportResult> {
  const take = resolveExportRowCap(input.cap)

  const ids = normalizeIdFilter(input.ids)
  const filters =
    ids || input.filters ? { ...(input.filters ?? {}), ...(ids ? { id: [...ids] } : {}) } : undefined

  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const { rows, total } = await exportWorkOrders({
    ...(filters ? { filters } : {}),
    ...(sort ? { sort } : {}),
    take,
  })

  return { rows, total }
}
