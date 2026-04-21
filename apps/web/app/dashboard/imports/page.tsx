import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import ImportsClient from "@/modules/imports/components/list/imports-client"
import { getImportsPageData, listImportsPageFilterOptions } from "@/modules/imports/data/queries"
import { getResolvedUserTablePreference } from "@builders/application"
import { parseServerTableFilterState } from "@/modules/shared/engines/list-view/controllers/table-filter-state"
import type { ImportPageFilterState } from "@builders/domain"
import { createImportsPageFilterDefinitions } from "@/modules/imports/components/list/table-filters"

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "imports-main")
  const warehouseOptions = await listImportsPageFilterOptions()
  const filterDefinitions = createImportsPageFilterDefinitions(warehouseOptions)
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : true,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["warehouse"],
    allowedGroupKeys: ["transport", "status", "warehouse"],
  })
  const filterState: ImportPageFilterState = parseServerTableFilterState({
    searchParams: resolvedSearchParams,
    definitions: filterDefinitions,
    preferenceFilters: initialTablePreferences.hasSavedPreference ? initialTablePreferences.filters : {},
  })
  const result = await getImportsPageData(page, tableState, filterState)

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
    <ImportsClient
      key={`imports-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}-${pageData.filterState.status}-${pageData.filterState.warehouseId}`}
      initialImports={pageData.initialImports}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      filterState={pageData.filterState}
      filterWarehouseOptions={warehouseOptions}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/imports", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/imports", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
