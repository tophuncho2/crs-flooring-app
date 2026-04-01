import DashboardErrorState from "@/features/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getInventoryPageData, listInventoryPageFilterOptions } from "@/features/flooring/inventory/queries"
import InventoryClient from "@/features/flooring/inventory/components/list/inventory-client"
import { parseServerTableFilterState } from "@/features/flooring/shared/controllers/table/table-filter-state"
import { createInventoryPageFilterDefinitions } from "@/features/flooring/inventory/table-filters"
import type { InventoryServerFilterState } from "@/features/flooring/inventory/domain/types"

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "inventory-main")
  const filterOptions = await listInventoryPageFilterOptions()
  const filterDefinitions = createInventoryPageFilterDefinitions(filterOptions)
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : [],
    allowedGroupKeys: ["status", "transport", "product", "warehouse", "section", "location"],
  })
  const filterState: InventoryServerFilterState = parseServerTableFilterState({
    searchParams: resolvedSearchParams,
    definitions: filterDefinitions,
    preferenceFilters: initialTablePreferences.hasSavedPreference ? initialTablePreferences.filters : {},
  })
  const result = await getInventoryPageData(page, tableState, filterState)

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

  return (
    <InventoryClient
      key={`inventory-${result.data.pagination.page}-${result.data.tableState.searchQuery}-${result.data.tableState.isAscendingSort}-${result.data.tableState.isGroupingEnabled}-${result.data.tableState.groupByKeys.join(",")}-${result.data.filterState.status}-${result.data.filterState.warehouseId}-${result.data.filterState.categoryId}-${result.data.filterState.productId}`}
      initialInventory={result.data.initialInventory}
      tableState={result.data.tableState}
      filterState={result.data.filterState}
      warehouseOptions={filterOptions.warehouseOptions}
      categoryOptions={filterOptions.categoryOptions}
      productOptions={filterOptions.productOptions}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...result.data.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/inventory", result.data.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/inventory", result.data.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
