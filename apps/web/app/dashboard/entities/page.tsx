import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listEntitiesUseCase,
  listEntityTypeOptionsByIdsUseCase,
} from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import EntitiesClient from "@/modules/entities/components/list/entities-client"
import {
  ENTITIES_LIST_QUERY_KEY,
  parseEntitiesListInputFromSearchParams,
} from "@/modules/entities/data/list-entities-request"

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseEntitiesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  // Settle the load into a result value (no try/catch around JSX, no
  // reassignment) so the success/error branches construct JSX outside any
  // try block — both required by the React Compiler lint rules.
  const load = await queryClient
    .prefetchQuery({
      queryKey: [...ENTITIES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listEntitiesUseCase(initialInput),
    })
    .then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    )

  if (!load.ok) {
    return (
      <DashboardErrorState
        title="Entities Unavailable"
        message="The app could not load the entities list."
        detail={load.error instanceof Error ? load.error.message : "Unknown error"}
        errorCode="ENTITY_LIST_LOAD_FAILED"
      />
    )
  }

  // Seed chip labels for any URL-restored entity-type filter so the toolbar
  // reads back on first paint (no flash of bare ids).
  const initialEntityTypeRefs = await listEntityTypeOptionsByIdsUseCase(
    initialInput.filters?.entityTypeIds,
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EntitiesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialEntityTypeRefs={initialEntityTypeRefs}
      />
    </HydrationBoundary>
  )
}
