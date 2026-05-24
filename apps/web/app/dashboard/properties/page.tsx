import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listPropertiesUseCase,
  searchManagementCompanyOptionsUseCase,
} from "@builders/application"
import type { ManagementCompanyOption } from "@builders/domain"
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

  let initialManagementCompanyOptions: ManagementCompanyOption[] = []
  let initialSelectedManagementCompany: ManagementCompanyOption | null = null

  try {
    const selectedManagementCompanyId =
      initialInput.filters?.managementCompanyId?.[0] ?? null

    const [, optionsPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...PROPERTIES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listPropertiesUseCase(initialInput),
      }),
      searchManagementCompanyOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialManagementCompanyOptions = optionsPage.items

    if (selectedManagementCompanyId) {
      const seeded = optionsPage.items.find(
        (option) => option.id === selectedManagementCompanyId,
      )
      if (seeded) {
        initialSelectedManagementCompany = seeded
      } else {
        const match = (
          await searchManagementCompanyOptionsUseCase({
            search: selectedManagementCompanyId,
            take: 1,
          })
        ).items[0]
        if (match && match.id === selectedManagementCompanyId) {
          initialSelectedManagementCompany = match
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
        initialManagementCompanyOptions={initialManagementCompanyOptions}
        initialSelectedManagementCompany={initialSelectedManagementCompany}
      />
    </HydrationBoundary>
  )
}
