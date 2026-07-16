import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { listWorkOrderDocumentTypesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import WorkOrderDocumentTypesClient from "@/modules/work-order-document-types/components/list/work-order-document-types-client"
import {
  WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY,
  parseWorkOrderDocumentTypesListInputFromSearchParams,
} from "@/modules/work-order-document-types/data/list-work-order-document-types-request"

export default async function WorkOrderDocumentTypesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseWorkOrderDocumentTypesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: [...WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY, initialInput],
      queryFn: () => listWorkOrderDocumentTypesUseCase(initialInput),
    })
  } catch (error) {
    return (
      <DashboardErrorState
        title="Document Types Unavailable"
        message="The app could not load the document types list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="WORK_ORDER_DOCUMENT_TYPES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkOrderDocumentTypesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
      />
    </HydrationBoundary>
  )
}
