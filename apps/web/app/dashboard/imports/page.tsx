import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listImportsUseCase,
  searchWarehouseOptionsUseCase,
} from "@builders/application"
import type { WarehouseOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import ImportsClient from "@/modules/imports/components/list/imports-client"
import {
  IMPORTS_LIST_QUERY_KEY,
  parseImportsListInputFromSearchParams,
} from "@/modules/imports/data/list-imports-request"

const INITIAL_OPTIONS_TAKE = 20

export default async function FlooringImportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseImportsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialWarehouseOptions: WarehouseOption[] = []
  let initialSelectedWarehouse: WarehouseOption | null = null

  try {
    const selectedWarehouseId = initialInput.filters?.warehouseId?.[0] ?? null

    const [, optionsPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...IMPORTS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listImportsUseCase(initialInput),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    const options = optionsPage.items
    initialWarehouseOptions = options

    if (selectedWarehouseId) {
      const seeded = options.find((option) => option.id === selectedWarehouseId)
      if (seeded) {
        initialSelectedWarehouse = seeded
      } else {
        const [match] = (
          await searchWarehouseOptionsUseCase({
            search: selectedWarehouseId,
            take: 1,
          })
        ).items
        if (match && match.id === selectedWarehouseId) {
          initialSelectedWarehouse = match
        }
      }
    }
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
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialWarehouseOptions={initialWarehouseOptions}
        initialSelectedWarehouse={initialSelectedWarehouse}
      />
    </HydrationBoundary>
  )
}
