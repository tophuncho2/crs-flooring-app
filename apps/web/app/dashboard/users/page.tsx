import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listUsersUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import UsersClient from "@/modules/users/components/list/users-client"
import {
  USERS_LIST_QUERY_KEY,
  parseUsersListInputFromSearchParams,
} from "@/modules/users/data/list-users-request"

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseUsersListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...USERS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listUsersUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Users Unavailable"
        message="The app could not load the users list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="USERS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
