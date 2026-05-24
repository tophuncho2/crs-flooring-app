import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listManufacturersUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireManufacturersAccess } from "@/modules/shared/access/lookup-domains"
import ManufacturersClient from "@/modules/manufacturers/components/list/manufacturers-client"
import {
  MANUFACTURERS_LIST_QUERY_KEY,
  parseManufacturersListInputFromSearchParams,
} from "@/modules/manufacturers/data/list-manufacturers-request"

export default async function ManufacturersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManufacturersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseManufacturersListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...MANUFACTURERS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listManufacturersUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Manufacturers Unavailable"
        message="The app could not load the manufacturers list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="MANUFACTURER_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManufacturersClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
      />
    </HydrationBoundary>
  )
}
