"use client"

import { useCallback, useMemo } from "react"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { PaginateControls } from "@/components/features/paginate"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { WarehousesListFilters } from "@builders/application"
import {
  LIST_WAREHOUSES_PAGE_SIZE,
  type WarehouseListRow,
} from "@builders/domain"
import {
  WAREHOUSE_LIST_QUERY_KEY,
  listWarehousesRequest,
} from "@/modules/warehouse/data/list-warehouse-request"
import { useWarehouseSidePanel } from "@/modules/warehouse/controllers/use-warehouse-side-panel"
import { WarehouseSidePanel } from "@/modules/warehouse/components/side-panel"
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
  const sidePanel = useWarehouseSidePanel()

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
  } = useServerListController<WarehouseListRow, WarehousesListFilters>({
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
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ListToolbar>
          <ListToolbarCell>
            <div className="flex flex-col">
              <span className="self-start rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
                Warehouse
              </span>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <WarehouseListSearch query={searchQuery} onQueryChange={onSearchQueryChange} />
                <ListToolbarBottomRow
                  left={<WarehouseClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WarehouseRowCount count={rows.length} total={total} />}
                />
              </div>
            </div>
          </ListToolbarCell>

          {/* Right-anchored action: + Warehouse occupies the top row of a
              single right-anchored cell; the bottom row is empty (warehouse
              has no secondary create flow like properties' + Hub). */}
          <ListToolbarCell className="ml-auto">
            <AddWarehouseButton onClick={() => sidePanel.openCreate()} />
          </ListToolbarCell>
        </ListToolbar>

        <WarehouseTable
          rows={rows}
          onOpen={sidePanel.openEdit}
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

      <WarehouseSidePanel controller={sidePanel} />
    </div>
  )
}
