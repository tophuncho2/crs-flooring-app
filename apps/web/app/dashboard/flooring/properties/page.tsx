import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getPropertiesPageData } from "@/features/flooring/properties/queries"
import PropertiesClient from "@/features/flooring/properties/components/properties-client"

export default async function FlooringPropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "properties-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    allowedGroupKeys: ["city", "state", "managementCompany"],
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["managementCompany"],
  })
  const result = await getPropertiesPageData(page, tableState)

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
    <PropertiesClient
      key={`properties-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialProperties={pageData.initialProperties}
      tableState={pageData.tableState}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/properties", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/flooring/properties", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
