import { countWorkOrders, listWorkOrders } from "@builders/db"
import type { WorkOrderListRow } from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

/**
 * Filter shape for the work-orders list. Each ID filter is a multi-value
 * array (single-element today, but the URL/repo contract is multi-value
 * so the upgrade path stays simple). `isComplete` is a single-element
 * enum: absent | `["hide"]` → hide completed (default), `["only"]` →
 * completed only, `["all"]` → no filter. The repo applies the default.
 */
export type WorkOrdersListFilters = {
  managementCompanyId?: string[]
  propertyId?: string[]
  templateId?: string[]
  warehouseId?: string[]
  isComplete?: string[]
}

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
