import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@builders/application"
import {
  getInventoryPageData,
  listInventoryPageFilterOptions,
} from "@/modules/inventory/data/queries"
import InventoryClient from "@/modules/inventory/components/list/inventory-client"
import { createInventoryPageFilterDefinitions } from "@/modules/inventory/components/list/table-filters"
import { parseServerTableFilterState } from "@/modules/shared/engines/list-view/controllers/table-filter-state"
import type { InventoryPageFilterState } from "@builders/domain"

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "inventory-main")
  const filterOptions = await listInventoryPageFilterOptions()
  const filterDefinitions = createInventoryPageFilterDefinitions(filterOptions)
  const filterState: InventoryPageFilterState = parseServerTableFilterState({
    searchParams: resolvedSearchParams,
    definitions: filterDefinitions,
    preferenceFilters: initialTablePreferences.hasSavedPreference
      ? initialTablePreferences.filters
      : {},
  })

  const result = await getInventoryPageData()

  if (!result.ok) {
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return (
    <InventoryClient
      initialInventory={result.data.initialInventory}
      filterState={filterState}
      warehouseOptions={filterOptions.warehouseOptions}
      categoryOptions={filterOptions.categoryOptions}
      productOptions={filterOptions.productOptions}
      initialTablePreferences={initialTablePreferences}
    />
  )
}
