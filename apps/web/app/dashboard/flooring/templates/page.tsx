import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireTemplatesAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getTemplatesPageData } from "@/features/flooring/templates/queries"
import TemplatesClient from "@/features/flooring/templates/list/templates-client"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireTemplatesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "templates-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : true,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["property"],
    allowedGroupKeys: ["templateTag", "property", "warehouse", "padType"],
  })
  const result = await getTemplatesPageData(page, tableState)

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
    <TemplatesClient
      key={`templates-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialTemplates={pageData.initialTemplates}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/templates", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/templates", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
