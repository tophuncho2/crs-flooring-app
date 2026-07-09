import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listWarehousesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import WarehouseClient from "@/modules/warehouse/components/list/warehouse-client"
import {
  WAREHOUSE_LIST_QUERY_KEY,
  parseWarehousesListInputFromSearchParams,
} from "@/modules/warehouse/data/list-warehouse-request"

export default async function FlooringWarehousePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialInput = parseWarehousesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...WAREHOUSE_LIST_QUERY_KEY, initialInput],
      queryFn: () => listWarehousesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Warehouses Unavailable"
        message="The app could not load the warehouses list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="WAREHOUSE_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WarehouseClient
        initialSearchQuery={initialInput.search ?? ""}
        initialStoreNumber={initialInput.filters?.storeNumber ?? ""}
        initialPage={initialInput.page}
      />
    </HydrationBoundary>
  )
}
