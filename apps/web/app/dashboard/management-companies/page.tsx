import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listManagementCompaniesUseCase,
  searchManagementCompanyStatesUseCase,
} from "@builders/application"
import type { ManagementCompanyStateOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ManagementCompaniesClient from "@/modules/management-companies/components/list/management-companies-client"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
  parseManagementCompaniesListInputFromSearchParams,
} from "@/modules/management-companies/data/list-management-companies-request"

const INITIAL_STATE_OPTIONS_TAKE = 20

export default async function ManagementCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseManagementCompaniesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialStateOptions: ManagementCompanyStateOption[] = []

  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listManagementCompaniesUseCase(initialInput),
      }),
      (async () => {
        initialStateOptions = await searchManagementCompanyStatesUseCase({
          take: INITIAL_STATE_OPTIONS_TAKE,
        })
      })(),
    ])
  } catch (error) {
    return (
      <DashboardErrorState
        title="Management Companies Unavailable"
        message="The app could not load the management companies list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="MANAGEMENT_COMPANY_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManagementCompaniesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialStateOptions={initialStateOptions}
      />
    </HydrationBoundary>
  )
}
