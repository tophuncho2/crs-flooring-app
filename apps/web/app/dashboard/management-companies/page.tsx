import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  getResolvedUserTablePreference,
  listManagementCompaniesUseCase,
} from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ManagementCompaniesClient from "@/modules/management-companies/components/list/management-companies-client"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
  parseManagementCompaniesListInputFromSearchParams,
} from "@/modules/management-companies/data/list-management-companies-request"

const MANAGEMENT_COMPANIES_FALLBACK_PREFERENCES: TablePreferencePayload = {
  sort: { key: "name", direction: "asc" },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: { enabled: false, keys: [] },
}

export default async function ManagementCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const userPreferences = await getResolvedUserTablePreference(
    user.id,
    "management-companies-main",
  )
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const effectivePreferences: TablePreferencePayload = userPreferences.hasSavedPreference
    ? userPreferences
    : MANAGEMENT_COMPANIES_FALLBACK_PREFERENCES

  const initialInput = parseManagementCompaniesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listManagementCompaniesUseCase(initialInput),
    })
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
        initialTablePreferences={effectivePreferences}
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
      />
    </HydrationBoundary>
  )
}
