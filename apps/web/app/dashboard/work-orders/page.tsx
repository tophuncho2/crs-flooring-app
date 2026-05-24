import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listWorkOrdersUseCase,
  searchManagementCompanyOptionsUseCase,
  searchPropertyOptionsUseCase,
  searchTemplateOptionsUseCase,
  searchWarehouseOptionsUseCase,
} from "@builders/application"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
  WarehouseOption,
} from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import WorkOrdersClient from "@/modules/work-orders/components/list/work-orders-client"
import {
  WORK_ORDERS_LIST_QUERY_KEY,
  parseWorkOrdersListInputFromSearchParams,
} from "@/modules/work-orders/data/list-work-orders-request"

const INITIAL_OPTIONS_TAKE = 20

async function resolveSelectedById<TOption extends { id: string }>(
  id: string,
  options: TOption[],
  fetchById: (id: string) => Promise<TOption | null>,
): Promise<TOption | null> {
  const seeded = options.find((option) => option.id === id) ?? null
  if (seeded) return seeded
  return fetchById(id)
}

export default async function FlooringWorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialInput = parseWorkOrdersListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialMgmtCoOptions: ManagementCompanyOption[] = []
  let initialSelectedMgmtCo: ManagementCompanyOption | null = null
  let initialPropertyOptions: PropertyOption[] = []
  let initialSelectedProperty: PropertyOption | null = null
  let initialTemplateOptions: TemplateOption[] = []
  let initialSelectedTemplate: TemplateOption | null = null
  let initialWarehouseOptions: WarehouseOption[] = []
  let initialSelectedWarehouse: WarehouseOption | null = null

  try {
    const selectedMgmtCoId = initialInput.filters?.managementCompanyId?.[0] ?? null
    const selectedPropertyId = initialInput.filters?.propertyId?.[0] ?? null
    const selectedTemplateId = initialInput.filters?.templateId?.[0] ?? null
    const selectedWarehouseId = initialInput.filters?.warehouseId?.[0] ?? null

    const [, mgmtCoPage, propertyPage, warehouseOptions] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...WORK_ORDERS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listWorkOrdersUseCase(initialInput),
      }),
      searchManagementCompanyOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
      searchPropertyOptionsUseCase({
        take: INITIAL_OPTIONS_TAKE,
        ...(selectedMgmtCoId ? { managementCompanyId: selectedMgmtCoId } : {}),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialMgmtCoOptions = mgmtCoPage.items
    initialPropertyOptions = propertyPage.items
    initialWarehouseOptions = warehouseOptions

    // Templates are property-scoped — only prefetch when a property is picked.
    if (selectedPropertyId) {
      const templatePage = await searchTemplateOptionsUseCase({
        take: INITIAL_OPTIONS_TAKE,
        propertyId: selectedPropertyId,
      })
      initialTemplateOptions = templatePage.items
    }

    if (selectedMgmtCoId) {
      initialSelectedMgmtCo = await resolveSelectedById(
        selectedMgmtCoId,
        mgmtCoPage.items,
        async (id) => {
          const match = (
            await searchManagementCompanyOptionsUseCase({ search: id, take: 1 })
          ).items[0]
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedPropertyId) {
      initialSelectedProperty = await resolveSelectedById(
        selectedPropertyId,
        propertyPage.items,
        async (id) => {
          const match = (
            await searchPropertyOptionsUseCase({ search: id, take: 1 })
          ).items[0]
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedTemplateId && selectedPropertyId) {
      initialSelectedTemplate = await resolveSelectedById(
        selectedTemplateId,
        initialTemplateOptions,
        async (id) => {
          const match = (
            await searchTemplateOptionsUseCase({
              search: id,
              propertyId: selectedPropertyId,
              take: 1,
            })
          ).items[0]
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedWarehouseId) {
      initialSelectedWarehouse = await resolveSelectedById(
        selectedWarehouseId,
        warehouseOptions,
        async (id) => {
          const [match] = await searchWarehouseOptionsUseCase({ search: id, take: 1 })
          return match && match.id === id ? match : null
        },
      )
    }
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
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialMgmtCoOptions={initialMgmtCoOptions}
        initialSelectedMgmtCo={initialSelectedMgmtCo}
        initialPropertyOptions={initialPropertyOptions}
        initialSelectedProperty={initialSelectedProperty}
        initialTemplateOptions={initialTemplateOptions}
        initialSelectedTemplate={initialSelectedTemplate}
        initialWarehouseOptions={initialWarehouseOptions}
        initialSelectedWarehouse={initialSelectedWarehouse}
      />
    </HydrationBoundary>
  )
}
