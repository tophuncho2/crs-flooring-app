import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  getResolvedUserTablePreference,
  listInventoryUseCase,
  searchCategoryOptionsUseCase,
  searchProductOptionsUseCase,
  searchWarehouseOptionsUseCase,
} from "@builders/application"
import type {
  CategoryOption,
  ProductOption,
  TablePreferencePayload,
  WarehouseOption,
} from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import InventoryClient from "@/modules/inventory/components/list/inventory-client"
import {
  INVENTORY_LIST_QUERY_KEY,
  parseInventoryListInputFromSearchParams,
} from "@/modules/inventory/data/list-inventory-request"

const INVENTORY_FALLBACK_PREFERENCES: TablePreferencePayload = {
  sort: { key: "inventoryNumber", direction: "desc" },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: { enabled: false, keys: [] },
}

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

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const userPreferences = await getResolvedUserTablePreference(user.id, "inventory-main")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const effectivePreferences: TablePreferencePayload = userPreferences.hasSavedPreference
    ? userPreferences
    : INVENTORY_FALLBACK_PREFERENCES

  const initialInput = parseInventoryListInputFromSearchParams(resolvedSearchParams)

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

    const [, warehouseOptions, categoryOptions] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...INVENTORY_LIST_QUERY_KEY, initialInput],
        queryFn: () => listInventoryUseCase(initialInput),
      }),
      searchWarehouseOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
      searchCategoryOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialWarehouseOptions = warehouseOptions
    initialCategoryOptions = categoryOptions

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

    if (selectedCategoryId) {
      initialSelectedCategory = await resolveSelectedById(
        selectedCategoryId,
        categoryOptions,
        async (id) => {
          const [match] = await searchCategoryOptionsUseCase({ search: id, take: 1 })
          return match && match.id === id ? match : null
        },
      )
    }

    if (selectedProductId) {
      const products = await searchProductOptionsUseCase({
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        take: INITIAL_OPTIONS_TAKE,
      })
      initialSelectedProduct = products.find((p) => p.id === selectedProductId) ?? null
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Inventory Unavailable"
        message="The app could not load the inventory list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="INVENTORY_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryClient
        initialTablePreferences={userPreferences}
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
