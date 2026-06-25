import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listCategoriesUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import CategoriesClient from "@/modules/categories/components/list/categories-client"
import {
  CATEGORIES_LIST_QUERY_KEY,
  parseCategoriesListInputFromSearchParams,
} from "@/modules/categories/data/list-categories-request"

export default async function FlooringCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseCategoriesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...CATEGORIES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listCategoriesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Categories Unavailable"
        message="The app could not load the categories list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="CATEGORIES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoriesClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
