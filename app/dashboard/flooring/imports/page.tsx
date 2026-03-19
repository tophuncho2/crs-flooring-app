import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam } from "@/server/pagination"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { getImportsPageData } from "@/features/flooring/imports/queries"

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const result = await getImportsPageData(page)

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
      initialImports={pageData.initialImports}
      productOptions={pageData.productOptions}
      warehouseOptions={pageData.warehouseOptions}
      locationOptions={pageData.locationOptions}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/imports", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/imports", pageData.pagination.page + 1),
      }}
    />
  )
}
