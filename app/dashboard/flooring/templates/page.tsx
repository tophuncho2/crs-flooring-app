import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import { getTemplatesPageData } from "@/features/flooring/templates/queries"
import TemplatesClient from "@/features/flooring/templates/components/templates-client"

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultGrouped: true,
    defaultGroupKeys: ["property"],
    allowedGroupKeys: ["templateNumber", "templateTag", "property", "warehouse", "instructions", "padType", "templateNotes"],
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
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
      tableState={pageData.tableState}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/templates", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/templates", pageData.pagination.page + 1),
      }}
    />
  )
}
