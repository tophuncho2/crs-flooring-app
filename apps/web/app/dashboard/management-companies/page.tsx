import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { getManagementCompaniesPageData } from "@/modules/management-companies/data/queries"
import ManagementCompaniesClient from "@/modules/management-companies/components/management-companies-client"

export default async function ManagementCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "management-companies-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : [],
    allowedGroupKeys: ["company", "street", "city", "state", "zip", "phone", "email", "fullAddress", "properties"],
  })
  const result = await getManagementCompaniesPageData(page, tableState)

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
    <ManagementCompaniesClient
      key={`management-companies-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialCompanies={pageData.initialCompanies}
      tableState={pageData.tableState}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/management-companies", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/management-companies", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
