import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listUnitOfMeasuresUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import UnitOfMeasuresClient from "@/modules/unit-of-measures/components/list/unit-of-measures-client"
import {
  UNIT_OF_MEASURES_LIST_QUERY_KEY,
  parseUnitOfMeasuresListInputFromSearchParams,
} from "@/modules/unit-of-measures/data/list-unit-of-measures-request"

export default async function UnitOfMeasuresPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseUnitOfMeasuresListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...UNIT_OF_MEASURES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listUnitOfMeasuresUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Unit Of Measures Unavailable"
        message="The app could not load the units of measure list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="UNIT_OF_MEASURES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UnitOfMeasuresClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
