import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getWorkOrdersPageData } from "@/features/flooring/work-orders/queries"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    allowedGroupKeys: ["status", "warehouse", "property", "date", "unitType", "vacancy"],
    defaultGroupKeys: ["warehouse"],
  })
  const result = await getWorkOrdersPageData(page, tableState)

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
      key={`wo-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialWorkOrders={pageData.initialWorkOrders}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      templateOptions={pageData.templateOptions}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/work-orders", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/work-orders", pageData.pagination.page + 1),
      }}
    />
  )
}
