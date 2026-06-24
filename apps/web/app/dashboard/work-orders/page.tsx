import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listWorkOrdersUseCase,
  searchJobTypeOptionsUseCase,
  searchEntityOptionsUseCase,
  searchPropertyOptionsUseCase,
  searchTemplateOptionsUseCase,
  searchWarehouseOptionsUseCase,
} from "@builders/application"
import type {
  JobTypeOption,
  EntityOption,
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

  let initialEntityOptions: EntityOption[] = []
  let initialSelectedEntity: EntityOption | null = null
  let initialPropertyOptions: PropertyOption[] = []
  let initialSelectedProperty: PropertyOption | null = null
  let initialTemplateOptions: TemplateOption[] = []
  let initialSelectedTemplate: TemplateOption | null = null
  let initialWarehouseOptions: WarehouseOption[] = []
  let initialSelectedWarehouse: WarehouseOption | null = null
  let initialJobTypeOptions: JobTypeOption[] = []
  let initialSelectedJobType: JobTypeOption | null = null

  try {
    const selectedEntityId = initialInput.filters?.entityId?.[0] ?? null
    const selectedPropertyId = initialInput.filters?.propertyId?.[0] ?? null
    const selectedTemplateId = initialInput.filters?.templateId?.[0] ?? null
    const selectedWarehouseId = initialInput.filters?.warehouseId?.[0] ?? null
    const selectedJobTypeId = initialInput.filters?.jobTypeId?.[0] ?? null

    const [, entityPage, propertyPage, warehousePage, jobTypeOptions] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...WORK_ORDERS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listWorkOrdersUseCase(initialInput),
      }),
      searchEntityOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
      searchPropertyOptionsUseCase({
        take: INITIAL_OPTIONS_TAKE,
        ...(selectedEntityId ? { entityId: selectedEntityId } : {}),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
      searchJobTypeOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    const warehouseOptions = warehousePage.items
    initialEntityOptions = entityPage.items
    initialPropertyOptions = propertyPage.items
    initialWarehouseOptions = warehouseOptions
    initialJobTypeOptions = jobTypeOptions

    // Templates are property-scoped — only prefetch when a property is picked.
    if (selectedPropertyId) {
      const templatePage = await searchTemplateOptionsUseCase({
        take: INITIAL_OPTIONS_TAKE,
        propertyId: selectedPropertyId,
      })
      initialTemplateOptions = templatePage.items
    }

    if (selectedEntityId) {
      initialSelectedEntity = await resolveSelectedById(
        selectedEntityId,
        entityPage.items,
        async (id) => {
          const match = (
            await searchEntityOptionsUseCase({ search: id, take: 1 })
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
          const [match] = (await searchWarehouseOptionsUseCase({ search: id, take: 1 })).items
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedJobTypeId) {
      initialSelectedJobType = await resolveSelectedById(
        selectedJobTypeId,
        jobTypeOptions,
        async (id) => {
          const [match] = await searchJobTypeOptionsUseCase({ search: id, take: 1 })
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
        initialEntityOptions={initialEntityOptions}
        initialSelectedEntity={initialSelectedEntity}
        initialPropertyOptions={initialPropertyOptions}
        initialSelectedProperty={initialSelectedProperty}
        initialTemplateOptions={initialTemplateOptions}
        initialSelectedTemplate={initialSelectedTemplate}
        initialWarehouseOptions={initialWarehouseOptions}
        initialSelectedWarehouse={initialSelectedWarehouse}
        initialJobTypeOptions={initialJobTypeOptions}
        initialSelectedJobType={initialSelectedJobType}
      />
    </HydrationBoundary>
  )
}
