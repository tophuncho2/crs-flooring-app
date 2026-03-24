import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { getImportsPageData } from "@/features/flooring/imports/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultGrouped: true,
    defaultGroupKeys: ["warehouse"],
    allowedGroupKeys: ["transport", "status", "warehouse"],
  })
  const [result, initialTablePreferences] = await Promise.all([
    getImportsPageData(page, tableState),
    getUserTablePreference(user.id, "imports-main"),
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
    <ImportsClient
      key={`imports-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      initialImports={pageData.initialImports}
      initialTablePreferences={initialTablePreferences}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/imports", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/imports", pageData.pagination.page + 1),
      }}
    />
  )
}
