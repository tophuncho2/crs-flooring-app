import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@builders/application"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getTemplatesPageData } from "@/modules/templates/data/queries"
import TemplatesClient from "@/modules/templates/components/list/templates-client"

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("templates")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "templates-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : [],
    allowedGroupKeys: ["property", "managementCompany", "jobType", "warehouse", "unitType"],
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
      tableState={pageData.tableState}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/templates", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/templates", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
