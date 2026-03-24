import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getInventoryPageData } from "@/features/flooring/inventory/queries"
import InventoryClient from "@/features/flooring/inventory/components/list/inventory-client"
import { parseInventoryStatusFilter, parseInventoryWarehouseFilter } from "@/features/flooring/inventory/domain/filters"

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultGrouped: false,
    defaultGroupKeys: [],
    allowedGroupKeys: ["status", "transport", "product", "warehouse", "section", "location"],
  })
  const filterState = {
    status: parseInventoryStatusFilter(resolvedSearchParams?.status),
    warehouseId: parseInventoryWarehouseFilter(resolvedSearchParams?.warehouse),
  }
  const [result, initialTablePreferences] = await Promise.all([
    getInventoryPageData(page, tableState, filterState),
    getUserTablePreference(user.id, "inventory-main"),
  ])

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
      key={`inventory-${result.data.pagination.page}-${result.data.tableState.searchQuery}-${result.data.tableState.isAscendingSort}-${result.data.tableState.isGroupingEnabled}-${result.data.tableState.groupByKeys.join(",")}-${result.data.filterState.status}-${result.data.filterState.warehouseId}`}
      initialInventory={result.data.initialInventory}
      tableState={result.data.tableState}
      filterState={result.data.filterState}
      warehouseOptions={result.data.warehouseOptions}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...result.data.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/inventory", result.data.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/inventory", result.data.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
