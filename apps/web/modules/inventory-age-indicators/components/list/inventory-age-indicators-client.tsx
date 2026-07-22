"use client"

import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { InventoryAgeIndicatorsListFilters, ListInput } from "@builders/application"
import {
  LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
  type InventoryAgeIndicatorListRow,
} from "@builders/domain"
import {
  INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY,
  listInventoryAgeIndicatorsRequest,
} from "@/modules/inventory-age-indicators/data/list-inventory-age-indicators-request"
import { useInventoryAgeIndicatorsListController } from "@/modules/inventory-age-indicators/controllers/list/use-inventory-age-indicators-list-controller"
import { InventoryAgeIndicatorsTable } from "./inventory-age-indicators-table"

// The list has no filters or search — the order is locked ASC by `days`. The
// engine filter map is empty; the toolbar carries only the label + create button.
type EngineInventoryAgeIndicatorFilters = Record<string, never>

export type InventoryAgeIndicatorsClientProps = {
  initialPage: number
}

export default function InventoryAgeIndicatorsClient({
  initialPage,
}: InventoryAgeIndicatorsClientProps) {
  const { message, pageError, openCreate, openInventoryAgeIndicator } =
    useInventoryAgeIndicatorsListController()

  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<InventoryAgeIndicatorListRow, EngineInventoryAgeIndicatorFilters>({
    mode: "fetch",
    queryKey: [...INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY],
    listFn: (input: ListInput<EngineInventoryAgeIndicatorFilters>) =>
      listInventoryAgeIndicatorsRequest({
        ...input,
        filters: {} as InventoryAgeIndicatorsListFilters,
      }),
    initialSearchQuery: "",
    initialPage,
    initialFilters: {},
    pageSize: LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
    tableKey: "inventory-age-indicators-main",
    filterableFields: [],
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Age Indicator" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar label="Age Indicators" hasActiveFilters={false} onClearAll={() => {}} />

      <InventoryAgeIndicatorsTable
        rows={rows}
        onOpenInventoryAgeIndicator={(row) => openInventoryAgeIndicator(row.id)}
        pagination={{
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasPreviousPage,
          hasNextPage,
          onPreviousPage: goToPreviousPage,
          onNextPage: goToNextPage,
        }}
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
      />
    </ListPageShell>
  )
}
