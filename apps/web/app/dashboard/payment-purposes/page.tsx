import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listPaymentPurposesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import PaymentPurposesClient from "@/modules/payment-purposes/components/list/payment-purposes-client"
import {
  PAYMENT_PURPOSES_LIST_QUERY_KEY,
  parsePaymentPurposesListInputFromSearchParams,
} from "@/modules/payment-purposes/data/list-payment-purposes-request"

export default async function FlooringPaymentPurposesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parsePaymentPurposesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...PAYMENT_PURPOSES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listPaymentPurposesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Payment Purposes Unavailable"
        message="The app could not load the payment purposes list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="PAYMENT_PURPOSES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentPurposesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
