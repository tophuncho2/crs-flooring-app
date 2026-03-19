import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam } from "@/server/pagination"
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
  const result = await getManagementCompaniesPageData(page)

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
      initialCompanies={pageData.initialCompanies}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/management-companies", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/management-companies", pageData.pagination.page + 1),
      }}
    />
  )
}
