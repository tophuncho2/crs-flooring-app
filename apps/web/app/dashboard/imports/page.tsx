import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { getResolvedUserTablePreference, listImportsUseCase } from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ImportsClient from "@/modules/imports/components/list/imports-client"
import {
  IMPORTS_LIST_QUERY_KEY,
  parseImportsListInputFromSearchParams,
} from "@/modules/imports/data/list-imports-request"

const IMPORTS_FALLBACK_PREFERENCES: TablePreferencePayload = {
  sort: { key: "importNumber", direction: "desc" },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: { enabled: true, keys: ["warehouse"] },
}

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const userPreferences = await getResolvedUserTablePreference(user.id, "imports-main")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const effectivePreferences: TablePreferencePayload = userPreferences.hasSavedPreference
    ? userPreferences
    : IMPORTS_FALLBACK_PREFERENCES

  const initialInput = parseImportsListInputFromSearchParams(
    resolvedSearchParams,
    effectivePreferences,
  )

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...IMPORTS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listImportsUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Imports Unavailable"
        message="The app could not load the imports list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="IMPORT_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportsClient
        initialTablePreferences={userPreferences}
        initialSearchQuery={initialInput.search ?? ""}
        initialGroupField={initialInput.group?.field ?? null}
        initialPage={initialInput.page}
      />
    </HydrationBoundary>
  )
}
