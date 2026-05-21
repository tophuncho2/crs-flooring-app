import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listTemplatesUseCase,
  searchManagementCompanyOptionsUseCase,
  searchPropertyOptionsUseCase,
} from "@builders/application"
import type {
  ManagementCompanyOption,
  PropertyOption,
} from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
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
  await requireToolAccess("templates")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseTemplatesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialManagementCompanyOptions: ManagementCompanyOption[] = []
  let initialSelectedManagementCompany: ManagementCompanyOption | null = null
  let initialSelectedProperty: PropertyOption | null = null

  try {
    const selectedManagementCompanyId =
      initialInput.filters?.managementCompanyId?.[0] ?? null
    const selectedPropertyId = initialInput.filters?.propertyId?.[0] ?? null

    const [, mcOptions] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...TEMPLATES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listTemplatesUseCase(initialInput),
      }),
      searchManagementCompanyOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialManagementCompanyOptions = mcOptions

    if (selectedManagementCompanyId) {
      initialSelectedManagementCompany = await resolveSelectedById(
        selectedManagementCompanyId,
        mcOptions,
        async (id) => {
          const [match] = await searchManagementCompanyOptionsUseCase({
            search: id,
            take: 1,
          })
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedPropertyId) {
      const properties = await searchPropertyOptionsUseCase({
        ...(selectedManagementCompanyId
          ? { managementCompanyId: selectedManagementCompanyId }
          : {}),
        take: INITIAL_OPTIONS_TAKE,
      })
      initialSelectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null
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
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialManagementCompanyOptions={initialManagementCompanyOptions}
        initialSelectedManagementCompany={initialSelectedManagementCompany}
        initialSelectedProperty={initialSelectedProperty}
      />
    </HydrationBoundary>
  )
}
