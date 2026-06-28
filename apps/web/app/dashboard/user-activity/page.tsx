import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listUserLoginActivityUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireManageUsersAccess } from "@/server/auth/session"
import UserActivityClient from "@/modules/user-activity/components/list/user-activity-client"
import {
  USER_ACTIVITY_LIST_QUERY_KEY,
  parseUserActivityListInputFromSearchParams,
} from "@/modules/user-activity/data/list-user-activity-request"

export default async function UserActivityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManageUsersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseUserActivityListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...USER_ACTIVITY_LIST_QUERY_KEY, initialInput],
      queryFn: () => listUserLoginActivityUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Login Activity Unavailable"
        message="The app could not load the login activity list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="USER_ACTIVITY_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserActivityClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
