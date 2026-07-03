import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listInvitesUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireManageUsersAccess } from "@/server/auth/session"
import InvitesClient from "@/modules/invites/components/list/invites-client"
import {
  INVITES_LIST_QUERY_KEY,
  parseInvitesListInputFromSearchParams,
} from "@/modules/invites/data/list-invites-request"

export default async function InvitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManageUsersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseInvitesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...INVITES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listInvitesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Invites Unavailable"
        message="The app could not load the invites list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="INVITES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvitesClient initialPage={initialInput.page} />
    </HydrationBoundary>
  )
}
