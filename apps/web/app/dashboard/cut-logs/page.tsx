import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listCutLogsUseCase, searchWarehouseOptionsUseCase } from "@builders/application"
import type { WarehouseOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import CutLogsClient from "@/modules/cut-logs/components/list/cut-logs-client"
import {
  CUT_LOGS_LIST_QUERY_KEY,
  parseCutLogsListInputFromSearchParams,
} from "@/modules/cut-logs/data/list-cut-logs-request"

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

export default async function CutLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseCutLogsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialWarehouseOptions: WarehouseOption[] = []
  let initialSelectedWarehouse: WarehouseOption | null = null

  try {
    const selectedWarehouseId = initialInput.filters?.warehouseId?.[0] ?? null

    const [, warehousePage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...CUT_LOGS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listCutLogsUseCase(initialInput),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    const warehouseOptions = warehousePage.items
    initialWarehouseOptions = warehouseOptions

    if (selectedWarehouseId) {
      initialSelectedWarehouse = await resolveSelectedById(
        selectedWarehouseId,
        warehouseOptions,
        async (id) => {
          const [match] = (await searchWarehouseOptionsUseCase({ search: id, take: 1 })).items
          return match && match.id === id ? match : null
        },
      )
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Cut Logs Unavailable"
        message="The app could not load the cut logs list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="CUT_LOGS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CutLogsClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialWarehouseOptions={initialWarehouseOptions}
        initialSelectedWarehouse={initialSelectedWarehouse}
      />
    </HydrationBoundary>
  )
}
