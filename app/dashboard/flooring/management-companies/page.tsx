import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { getManagementCompaniesPageData } from "@/features/flooring/management-companies/queries"
import ManagementCompaniesClient from "@/features/flooring/management-companies/components/management-companies-client"

export default async function ManagementCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    allowedGroupKeys: ["company", "street", "city", "state", "zip", "phone", "email", "fullAddress"],
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
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/management-companies", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/management-companies", pageData.pagination.page + 1),
      }}
    />
  )
}
