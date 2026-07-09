import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listEntityTypesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import EntityTypesClient from "@/modules/entity-types/components/list/entity-types-client"
import {
  ENTITY_TYPES_LIST_QUERY_KEY,
  parseEntityTypesListInputFromSearchParams,
} from "@/modules/entity-types/data/list-entity-types-request"

export default async function FlooringEntityTypesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseEntityTypesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...ENTITY_TYPES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listEntityTypesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Entity Types Unavailable"
        message="The app could not load the entity types list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="ENTITY_TYPES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EntityTypesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
