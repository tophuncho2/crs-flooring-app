import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listLaborPaymentsUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import LaborPaymentsClient from "@/modules/labor-payments/components/list/labor-payments-client"
import {
  LABOR_PAYMENTS_LIST_QUERY_KEY,
  parseLaborPaymentsListInputFromSearchParams,
} from "@/modules/labor-payments/data/list-labor-payments-request"

export default async function FlooringLaborPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseLaborPaymentsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...LABOR_PAYMENTS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listLaborPaymentsUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Labor Payments Unavailable"
        message="The app could not load the labor payments list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="LABOR_PAYMENTS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LaborPaymentsClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
