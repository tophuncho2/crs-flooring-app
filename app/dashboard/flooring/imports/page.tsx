import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { getImportsPageData, listImportsPageFilterOptions } from "@/features/flooring/imports/queries"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableFilterState } from "@/features/flooring/shared/controllers/table/table-filter-state"
import type { ImportPageFilterState } from "@/features/flooring/imports/domain/filters"
import { createImportsPageFilterDefinitions } from "@/features/flooring/imports/table-filters"

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
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.isAscendingSort : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.isGroupingEnabled : true,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.groupByKeys : ["warehouse"],
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
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/imports", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/imports", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
