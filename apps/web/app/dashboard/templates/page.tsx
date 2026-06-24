import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listTemplatesUseCase,
  searchEntityOptionsUseCase,
  searchPropertyOptionsUseCase,
} from "@builders/application"
import type {
  EntityOption,
  PropertyOption,
} from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import TemplatesClient from "@/modules/templates/components/list/templates-client"
import {
  parseTemplatesListInputFromSearchParams,
  TEMPLATES_LIST_QUERY_KEY,
} from "@/modules/templates/data/list-templates-request"

const INITIAL_OPTIONS_TAKE = 20

async function resolveSelectedById<TOption extends { id: string }>(
  id: string,
  options: TOption[],
  fetchById: (id: string) => Promise<TOption | null>,
): Promise<TOption | null> {
  const seeded = options.find((option) => option.id === id) ?? null
  if (seeded) return seeded
  return fetchById(id)
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseTemplatesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialEntityOptions: EntityOption[] = []
  let initialSelectedEntity: EntityOption | null = null
  let initialSelectedProperty: PropertyOption | null = null

  try {
    const selectedEntityId =
      initialInput.filters?.entityId?.[0] ?? null
    const selectedPropertyId = initialInput.filters?.propertyId?.[0] ?? null

    const [, entityOptionsPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...TEMPLATES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listTemplatesUseCase(initialInput),
      }),
      searchEntityOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialEntityOptions = entityOptionsPage.items

    if (selectedEntityId) {
      initialSelectedEntity = await resolveSelectedById(
        selectedEntityId,
        entityOptionsPage.items,
        async (id) => {
          const match = (
            await searchEntityOptionsUseCase({ search: id, take: 1 })
          ).items[0]
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedPropertyId) {
      const propertiesPage = await searchPropertyOptionsUseCase({
        ...(selectedEntityId
          ? { entityId: selectedEntityId }
          : {}),
        take: INITIAL_OPTIONS_TAKE,
      })
      initialSelectedProperty =
        propertiesPage.items.find((p) => p.id === selectedPropertyId) ?? null
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Templates Unavailable"
        message="The app could not load the templates list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="TEMPLATE_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TemplatesClient
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialEntityOptions={initialEntityOptions}
        initialSelectedEntity={initialSelectedEntity}
        initialSelectedProperty={initialSelectedProperty}
      />
    </HydrationBoundary>
  )
}
