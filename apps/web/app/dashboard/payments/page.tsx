import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { RESTRICTED_MODULE_MIN_RANK } from "@builders/domain"
import { listPaymentsUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import PaymentsClient from "@/modules/payments/components/list/payments-client"
import {
  PAYMENTS_LIST_QUERY_KEY,
  parsePaymentsListInputFromSearchParams,
} from "@/modules/payments/data/list-payments-request"

export default async function FlooringPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(RESTRICTED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parsePaymentsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...PAYMENTS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listPaymentsUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Payments Unavailable"
        message="The app could not load the payments list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="PAYMENTS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentsClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
