import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import ImportsClient from "@/modules/imports/components/list/imports-client"
import { getImportsPageData } from "@/modules/imports/data/queries"
import { getResolvedUserTablePreference } from "@builders/application"

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "imports-main")
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : true,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["warehouse"],
    allowedGroupKeys: ["transport", "status", "warehouse"],
  })
  const result = await getImportsPageData(page, tableState)

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
    <ImportsClient
      key={`imports-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialImports={pageData.initialImports}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/imports", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/imports", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
