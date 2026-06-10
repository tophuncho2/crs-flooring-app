import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listContactsUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import ContactsClient from "@/modules/contacts/components/list/contacts-client"
import {
  CONTACTS_LIST_QUERY_KEY,
  parseContactsListInputFromSearchParams,
} from "@/modules/contacts/data/list-contacts-request"

export default async function FlooringContactsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseContactsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...CONTACTS_LIST_QUERY_KEY, initialInput],
      queryFn: () => listContactsUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Contacts Unavailable"
        message="The app could not load the contacts list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="CONTACTS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactsClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
