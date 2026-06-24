import { countWorkOrders, listWorkOrders } from "@builders/db"
import type { WorkOrderListRow } from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200
/** Cap on user-selected sort columns (the engine + API enforce the same). */
const MAX_SORT_LEVELS = 3

/**
 * Filter shape for the work-orders list. Each ID filter is a multi-value
 * array (single-element today, but the URL/repo contract is multi-value
 * so the upgrade path stays simple).
 */
export type WorkOrdersListFilters = {
  entityId?: string[]
  propertyId?: string[]
  templateId?: string[]
  warehouseId?: string[]
  jobTypeId?: string[]
  // Per-column identity search — the list-view search bars. Each is a free-text
  // ILIKE against its own column; single-element arrays matching the multi-value
  // filter contract, AND-ed together to narrow.
  unitType?: string[]
  unitNumber?: string[]
  workOrderNumber?: string[]
  description?: string[]
  // Vacancy enum filter — single-element array of `VACANT` / `OCCUPIED`.
  vacancy?: string[]
  // Inclusive `scheduledFor` lower / upper bound as `YYYY-MM-DD` (single-element
  // arrays). From-only ⇒ on/after; To-only ⇒ on/before; same date ⇒ that day.
  scheduledForStart?: string[]
  scheduledForEnd?: string[]
}

export async function listWorkOrdersUseCase(
  input: ListInput<WorkOrdersListFilters>,
): Promise<ListOutput<WorkOrderListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || DEFAULT_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedPageSize))

  // The multi-column `sorts` array is canonical; a single `sort` is treated as
  // an array of one. Highest priority first, capped at MAX_SORT_LEVELS. The repo
  // silently drops unknown fields, so no field whitelist is needed here.
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const [rows, total] = await Promise.all([
    listWorkOrders({
      sort,
      filters: input.filters,
      pagination: { skip: (page - 1) * pageSize, take: pageSize },
    }),
    countWorkOrders({ filters: input.filters }),
  ])

  return { rows, total }
}
