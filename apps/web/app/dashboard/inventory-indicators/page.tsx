import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  listIndicatorsUseCase,
  searchCategoryOptionsUseCase,
  searchProductOptionsUseCase,
  searchWarehouseOptionsUseCase,
} from "@builders/application"
import type { CategoryOption, ProductOption, WarehouseOption } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import InventoryIndicatorsClient from "@/modules/inventory-indicators/components/list/inventory-indicators-client"
import {
  INDICATORS_LIST_QUERY_KEY,
  parseIndicatorsListInputFromSearchParams,
} from "@/modules/inventory-indicators/data/list-inventory-indicators-request"

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

export default async function InventoryIndicatorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialInput = parseIndicatorsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialWarehouseOptions: WarehouseOption[] = []
  let initialSelectedWarehouse: WarehouseOption | null = null
  let initialCategoryOptions: CategoryOption[] = []
  let initialSelectedCategory: CategoryOption | null = null
  let initialSelectedProduct: ProductOption | null = null

  try {
    const selectedWarehouseId = initialInput.filters?.warehouseId?.[0] ?? null
    const selectedCategoryId = initialInput.filters?.categoryId?.[0] ?? null
    const selectedProductId = initialInput.filters?.productId?.[0] ?? null

    const [, warehousePage, categoryPage] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...INDICATORS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listIndicatorsUseCase(initialInput),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
      searchCategoryOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialWarehouseOptions = warehousePage.items
    initialCategoryOptions = categoryPage.items

    if (selectedWarehouseId) {
      initialSelectedWarehouse = await resolveSelectedById(
        selectedWarehouseId,
        initialWarehouseOptions,
        async (id) => {
          const [match] = (await searchWarehouseOptionsUseCase({ search: id, take: 1 })).items
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedCategoryId) {
      initialSelectedCategory = await resolveSelectedById(
        selectedCategoryId,
        initialCategoryOptions,
        async (id) => {
          const [match] = (await searchCategoryOptionsUseCase({ search: id, take: 1 })).items
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedProductId) {
      const productsPage = await searchProductOptionsUseCase({ take: INITIAL_OPTIONS_TAKE })
      initialSelectedProduct = productsPage.items.find((p) => p.id === selectedProductId) ?? null
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Inventory Indicators Unavailable"
        message="The app could not load the inventory indicators list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="INVENTORY_INDICATORS_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryIndicatorsClient
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialWarehouseOptions={initialWarehouseOptions}
        initialSelectedWarehouse={initialSelectedWarehouse}
        initialCategoryOptions={initialCategoryOptions}
        initialSelectedCategory={initialSelectedCategory}
        initialSelectedProduct={initialSelectedProduct}
      />
    </HydrationBoundary>
  )
}
