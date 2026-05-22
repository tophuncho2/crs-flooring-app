import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  getResolvedUserTablePreference,
  listJobTypesUseCase,
} from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import JobTypesClient from "@/modules/job-types/components/list/job-types-client"
import {
  JOB_TYPES_LIST_QUERY_KEY,
  parseJobTypesListInputFromSearchParams,
} from "@/modules/job-types/data/list-job-types-request"

const JOB_TYPES_FALLBACK_PREFERENCES: TablePreferencePayload = {
  sort: { key: "name", direction: "asc" },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: { enabled: false, keys: [] },
}

export default async function FlooringJobTypesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const userPreferences = await getResolvedUserTablePreference(user.id, "job-types-main")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const effectivePreferences: TablePreferencePayload = userPreferences.hasSavedPreference
    ? userPreferences
    : JOB_TYPES_FALLBACK_PREFERENCES

  const initialInput = parseJobTypesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...JOB_TYPES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listJobTypesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Job Types Unavailable"
        message="The app could not load the job types list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="JOB_TYPES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JobTypesClient
        initialTablePreferences={effectivePreferences}
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
