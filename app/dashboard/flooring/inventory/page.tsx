import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getInventoryPageData } from "@/features/flooring/inventory/queries"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultGrouped: false,
    defaultGroupKeys: [],
    allowedGroupKeys: ["importNumber", "importTag", "status", "transport", "product", "itemNumber", "warehouse", "section", "location", "dyeLot", "cost", "freight", "updated"],
  })
  const result = await getInventoryPageData(page, tableState)

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
      key={`inventory-${result.data.pagination.page}-${result.data.tableState.searchQuery}-${result.data.tableState.isAscendingSort}-${result.data.tableState.isGroupingEnabled}-${result.data.tableState.groupByKeys.join(",")}`}
      initialInventory={result.data.initialInventory}
      locationOptions={result.data.locationOptions}
      tableState={result.data.tableState}
      pagination={{
        ...result.data.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/inventory", result.data.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/inventory", result.data.pagination.page + 1),
      }}
    />
  )
}
