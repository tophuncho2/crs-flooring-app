import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import {
  getResolvedUserTablePreference,
  listProductsUseCase,
  searchCategoryOptionsUseCase,
} from "@builders/application"
import type { CategoryOption, TablePreferencePayload } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ProductsClient from "@/modules/products/components/list/products-client"
import {
  PRODUCTS_LIST_QUERY_KEY,
  parseProductsListInputFromSearchParams,
} from "@/modules/products/data/list-products-request"

const PRODUCTS_FALLBACK_PREFERENCES: TablePreferencePayload = {
  sort: { key: "category.slug", direction: "asc" },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: { enabled: false, keys: [] },
}

const INITIAL_OPTIONS_TAKE = 20

export default async function FlooringProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("products")
  const userPreferences = await getResolvedUserTablePreference(user.id, "products-main")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const effectivePreferences: TablePreferencePayload = userPreferences.hasSavedPreference
    ? userPreferences
    : PRODUCTS_FALLBACK_PREFERENCES

  const initialInput = parseProductsListInputFromSearchParams(resolvedSearchParams)

  const queryClient = new QueryClient()

  let initialCategoryOptions: CategoryOption[] = []
  let initialSelectedCategory: CategoryOption | null = null

  try {
    const selectedCategoryId = initialInput.filters?.categoryId?.[0] ?? null

    const [, options] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...PRODUCTS_LIST_QUERY_KEY, initialInput],
        queryFn: () => listProductsUseCase(initialInput),
      }),
      searchCategoryOptionsUseCase({ take: INITIAL_OPTIONS_TAKE }),
    ])

    initialCategoryOptions = options

    if (selectedCategoryId) {
      const seeded = options.find((option) => option.id === selectedCategoryId)
      if (seeded) {
        initialSelectedCategory = seeded
      } else {
        const [match] = await searchCategoryOptionsUseCase({
          search: selectedCategoryId,
          take: 1,
        })
        if (match && match.id === selectedCategoryId) {
          initialSelectedCategory = match
        }
      }
    }
  } catch (error) {
    return (
      <DashboardErrorState
        title="Products Unavailable"
        message="The app could not load the products list."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="PRODUCT_LIST_LOAD_FAILED"
      />
    )
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsClient
        initialTablePreferences={effectivePreferences}
        initialSearchQuery={initialInput.search ?? ""}
        initialPage={initialInput.page}
        initialFilters={initialInput.filters ?? {}}
        initialCategoryOptions={initialCategoryOptions}
        initialSelectedCategory={initialSelectedCategory}
      />
    </HydrationBoundary>
  )
}
