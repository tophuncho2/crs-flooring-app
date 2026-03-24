import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
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
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    allowedGroupKeys: ["city", "state", "managementCompany"],
    defaultGroupKeys: ["managementCompany"],
  })
  const [result, initialTablePreferences] = await Promise.all([
    getPropertiesPageData(page, tableState),
    getUserTablePreference(user.id, "properties-main"),
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
    <PropertiesClient
      key={`properties-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialProperties={pageData.initialProperties}
      managementOptions={pageData.managementOptions}
      tableState={pageData.tableState}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/properties", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/properties", pageData.pagination.page + 1),
      }}
    />
  )
}
