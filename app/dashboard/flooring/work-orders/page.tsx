import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireWorkOrdersAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getWorkOrdersPageData } from "@/features/flooring/work-orders/queries"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireWorkOrdersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    allowedGroupKeys: ["status", "warehouse", "property", "date", "unitType", "vacancy"],
    defaultGroupKeys: ["warehouse"],
  })
  const [result, initialTablePreferences] = await Promise.all([
    getWorkOrdersPageData(page, tableState),
    getUserTablePreference(user.id, "work-orders-main"),
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

  const pageData = result.data

  return (
    <WorkOrdersClient
      key={`wo-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialWorkOrders={pageData.initialWorkOrders}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      templateOptions={pageData.templateOptions}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/work-orders", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/work-orders", pageData.pagination.page + 1),
      }}
    />
  )
}
