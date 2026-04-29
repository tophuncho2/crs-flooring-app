import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import WorkOrdersClient from "@/modules/work-orders/components/list/work-orders-client"
import {
  WORK_ORDERS_LIST_QUERY_KEY,
  listWorkOrdersRequest,
  parseWorkOrdersListInputFromSearchParams,
} from "@/modules/work-orders/data/list-work-orders-request"

export default async function FlooringWorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialInput = parseWorkOrdersListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...WORK_ORDERS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listWorkOrdersRequest(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Work Orders Unavailable"
        message="The app could not load the work orders list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="WORK_ORDERS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkOrdersClient
        initialSearchQuery={initialInput.search ?? ""}
        initialIsAscendingSort={(initialInput.sort?.direction ?? "asc") === "asc"}
        initialPage={initialInput.page}
      />
    </HydrationBoundary>
  )
}
