import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireWorkOrdersAccess } from "@/modules/shared/access/templates-work-orders"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getWorkOrdersPageData, listWorkOrdersPageFilterOptions } from "@/modules/work-orders/queries"
import WorkOrdersClient from "@/modules/work-orders/list/work-orders-client"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableFilterState } from "@/modules/shared/engines/list-view/controllers/table-filter-state"
import { createWorkOrdersPageFilterDefinitions } from "@/modules/work-orders/table-filters"
import type { WorkOrderServerFilterState } from "@/modules/work-orders/types"

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireWorkOrdersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "work-orders-main")
  const warehouseFilterOptions = await listWorkOrdersPageFilterOptions()
  const filterDefinitions = createWorkOrdersPageFilterDefinitions(warehouseFilterOptions)
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    allowedGroupKeys: ["status", "warehouse", "property", "date", "unitType", "vacancy"],
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["warehouse"],
  })
  const filterState: WorkOrderServerFilterState = parseServerTableFilterState({
    searchParams: resolvedSearchParams,
    definitions: filterDefinitions,
    preferenceFilters: initialTablePreferences.hasSavedPreference ? initialTablePreferences.filters : {},
  })
  const result = await getWorkOrdersPageData(page, tableState, filterState, warehouseFilterOptions)

  if (!result.ok) {
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  const pageData = result.data

  return (
    <WorkOrdersClient
      key={`wo-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}-${pageData.filterState.status}-${pageData.filterState.warehouseId}`}
      initialWorkOrders={pageData.initialWorkOrders}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      templateOptions={pageData.templateOptions}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      filterState={pageData.filterState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/work-orders", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/work-orders", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
