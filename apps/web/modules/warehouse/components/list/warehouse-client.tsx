"use client"

import { useCallback, useMemo } from "react"
import { ListToolbar, ListToolbarBottomRow, ListToolbarCell, ListViewNoticePortal, PaginateControls, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { WarehousesListFilters } from "@builders/application"
import {
  LIST_WAREHOUSES_PAGE_SIZE,
  type WarehouseListRow,
} from "@builders/domain"
import {
  WAREHOUSE_LIST_QUERY_KEY,
  listWarehousesRequest,
} from "@/modules/warehouse/data/list-warehouse-request"
import { useWarehouseListController } from "@/modules/warehouse/controllers/list/use-warehouse-list-controller"
import { WarehouseTable } from "./warehouse-table"
import { AddWarehouseButton } from "./toolbar-controls/add-warehouse-button"
import { WarehouseListSearch } from "./toolbar-controls/warehouse-list-search"
import { WarehouseClearAll } from "./toolbar-controls/sub-controls/warehouse-clear-all"
import { WarehouseRowCount } from "./toolbar-controls/sub-controls/warehouse-row-count"

export type WarehouseClientProps = {
  initialSearchQuery: string
  initialPage: number
}

export default function WarehouseClient({
  initialSearchQuery,
  initialPage,
}: WarehouseClientProps) {
  const { openCreate, openWarehouse } = useWarehouseListController()

  const {
    rows,
    total,
    searchQuery,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
  } = useFetchListController<WarehouseListRow, WarehousesListFilters>({
    mode: "fetch",
    queryKey: [...WAREHOUSE_LIST_QUERY_KEY],
    listFn: listWarehousesRequest,
    initialSearchQuery,
    initialPage,
    pageSize: LIST_WAREHOUSES_PAGE_SIZE,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0,
    [searchQuery],
  )

  const handleClearAll = useCallback(
    () => onSearchQueryChange(""),
    [onSearchQueryChange],
  )

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <ListViewNoticePortal label="Warehouse" />
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Warehouse
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <WarehouseListSearch query={searchQuery} onQueryChange={onSearchQueryChange} />
                <ListToolbarBottomRow
                  left={<WarehouseClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WarehouseRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddWarehouseButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <WarehouseTable
        rows={rows}
        onOpen={(row) => openWarehouse(row.id)}
        pagination={
          <PaginateControls
            page={page}
            pageSize={pageSize}
            totalItems={total}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        }
      />
    </div>
  )
}
