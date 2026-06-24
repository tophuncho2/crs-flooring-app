import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listManagementCompaniesUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import ManagementCompaniesClient from "@/modules/management-companies/components/list/management-companies-client"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
  parseManagementCompaniesListInputFromSearchParams,
} from "@/modules/management-companies/data/list-management-companies-request"

export default async function ManagementCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseManagementCompaniesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  // Settle the load into a result value (no try/catch around JSX, no
  // reassignment) so the success/error branches construct JSX outside any
  // try block — both required by the React Compiler lint rules.
  const load = await queryClient
    .prefetchQuery({
      queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listManagementCompaniesUseCase(initialInput),
    })
    .then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    )

  if (!load.ok) {
    return (
      <DashboardErrorState
        title="Management Companies Unavailable"
        message="The app could not load the management companies list."
        detail={load.error instanceof Error ? load.error.message : "Unknown error"}
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
      />
    </HydrationBoundary>
  )
}
