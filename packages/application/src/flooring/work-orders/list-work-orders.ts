import { countWorkOrders, listWorkOrders } from "@builders/db"
import type { WorkOrderListRow } from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

/**
 * Filter shape for the work-orders list. Starts as an empty record;
 * concrete filter dimensions (e.g. status, warehouse, jobType) will be
 * added alongside the canonical filter UI wiring in the work-orders
 * sweep. Until then, the controller / use case / repo accept the empty
 * shape as a foundation pass-through.
 */
export type WorkOrdersListFilters = Record<string, never>

export async function listWorkOrdersUseCase(
  input: ListInput<WorkOrdersListFilters>,
): Promise<ListOutput<WorkOrderListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || DEFAULT_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const sort = input.sort
    ? {
        direction: input.sort.direction,
        groupByKeys: input.group ? [input.group.field] : [],
        isGroupingEnabled: Boolean(input.group),
      }
    : undefined

  const [rows, total] = await Promise.all([
    listWorkOrders({
      searchQuery: search,
      sort,
      filters: input.filters,
      pagination: { skip: (page - 1) * pageSize, take: pageSize },
    }),
    countWorkOrders({ searchQuery: search, filters: input.filters }),
  ])

  return { rows, total }
}
