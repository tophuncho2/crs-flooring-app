import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listInventoryAgeIndicatorsUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import InventoryAgeIndicatorsClient from "@/modules/inventory-age-indicators/components/list/inventory-age-indicators-client"
import {
  INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY,
  parseInventoryAgeIndicatorsListInputFromSearchParams,
} from "@/modules/inventory-age-indicators/data/list-inventory-age-indicators-request"

export default async function FlooringInventoryAgeIndicatorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseInventoryAgeIndicatorsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listInventoryAgeIndicatorsUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Age Indicators Unavailable"
        message="The app could not load the inventory age indicators list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="INVENTORY_AGE_INDICATORS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryAgeIndicatorsClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
