import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listPropertiesUseCase } from "@builders/application"
import type { ListInput, PropertiesListFilters } from "@builders/application"
import { LIST_PROPERTIES_PAGE_SIZE } from "@builders/domain"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation/routes"
import { getManagementCompanyDetailPageData } from "@/modules/management-companies/data/queries"
import { ManagementCompanyHubClient } from "@/modules/management-companies/components/record/management-company-hub-client"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"

export default async function ManagementCompanyHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getManagementCompanyDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }
    if (!("error" in result)) {
      notFound()
    }

    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  const initialPropertiesInput: ListInput<PropertiesListFilters> = {
    filters: { managementCompanyId: [id] },
    page: 1,
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
  }

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...PROPERTIES_LIST_QUERY_KEY, initialPropertiesInput],
      queryFn: () => listPropertiesUseCase(initialPropertiesInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Management Company Hub Unavailable"
        message="The app could not load this management company's properties."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="MANAGEMENT_COMPANY_HUB_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManagementCompanyHubClient
        company={result.data.company}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/management-companies")}
        initialPropertiesInput={initialPropertiesInput}
      />
    </HydrationBoundary>
  )
}
