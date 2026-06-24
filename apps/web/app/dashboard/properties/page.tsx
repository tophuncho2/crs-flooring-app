import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listPropertiesUseCase,
  searchEntityOptionsUseCase,
} from "@builders/application"
import type { EntityOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import PropertiesClient from "@/modules/properties/components/list/properties-client"
import {
  PROPERTIES_LIST_QUERY_KEY,
  parsePropertiesListInputFromSearchParams,
} from "@/modules/properties/data/list-properties-request"

const INITIAL_OPTIONS_TAKE = 20

export default async function FlooringPropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parsePropertiesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialEntityOptions: EntityOption[] = []
  let initialSelectedEntity: EntityOption | null = null

  try {
    const selectedEntityId =
      initialInput.filters?.entityId?.[0] ?? null

    const [, optionsPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...PROPERTIES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listPropertiesUseCase(initialInput),
      }),
      searchEntityOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialEntityOptions = optionsPage.items

    if (selectedEntityId) {
      const seeded = optionsPage.items.find(
        (option) => option.id === selectedEntityId,
      )
      if (seeded) {
        initialSelectedEntity = seeded
      } else {
        const match = (
          await searchEntityOptionsUseCase({
            search: selectedEntityId,
            take: 1,
          })
        ).items[0]
        if (match && match.id === selectedEntityId) {
          initialSelectedEntity = match
        }
      }
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Properties Unavailable"
        message="The app could not load the properties list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="PROPERTY_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PropertiesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialEntityOptions={initialEntityOptions}
        initialSelectedEntity={initialSelectedEntity}
      />
    </HydrationBoundary>
  )
}
