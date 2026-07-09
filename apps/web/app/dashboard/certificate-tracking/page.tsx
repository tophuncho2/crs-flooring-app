import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listCertificatesUseCase,
  searchEntityOptionsUseCase,
} from "@builders/application"
import type { EntityOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import CertificatesClient from "@/modules/certificates/components/list/certificates-client"
import {
  CERTIFICATES_LIST_QUERY_KEY,
  parseCertificatesListInputFromSearchParams,
} from "@/modules/certificates/data/list-certificates-request"

const INITIAL_OPTIONS_TAKE = 20

export default async function CertificateTrackingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseCertificatesListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialEntityOptions: EntityOption[] = []
  let initialSelectedEntity: EntityOption | null = null

  try {
    const selectedEntityId = initialInput.filters?.entityId?.[0] ?? null

    const [, optionsPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...CERTIFICATES_LIST_QUERY_KEY, initialInput],
        queryFn: () => listCertificatesUseCase(initialInput),
      }),
      searchEntityOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialEntityOptions = optionsPage.items

    if (selectedEntityId) {
      const seeded = optionsPage.items.find((option) => option.id === selectedEntityId)
      if (seeded) {
        initialSelectedEntity = seeded
      } else {
        const match = (
          await searchEntityOptionsUseCase({ search: selectedEntityId, take: 1 })
        ).items[0]
        if (match && match.id === selectedEntityId) {
          initialSelectedEntity = match
        }
      }
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Certificates Unavailable"
        message="The app could not load the certificates list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="CERTIFICATES_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CertificatesClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialEntityOptions={initialEntityOptions}
        initialSelectedEntity={initialSelectedEntity}
      />
    </HydrationBoundary>
  )
}
