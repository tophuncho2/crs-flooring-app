"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls, ListToolbar, ListToolbarBottomRow, ListToolbarCell, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ManufacturersListFilters } from "@builders/application"
import {
  LIST_MANUFACTURERS_PAGE_SIZE,
  type ManufacturerListRow,
} from "@builders/domain"
import {
  MANUFACTURERS_LIST_QUERY_KEY,
  listManufacturersRequest,
} from "@/modules/manufacturers/data/list-manufacturers-request"
import { useManufacturerSidePanel } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"
import { ManufacturerSidePanel } from "@/modules/manufacturers/components/side-panel"
import { ManufacturersTable } from "./manufacturers-table"
import { AddManufacturerButton } from "./toolbar-controls/add-manufacturer-button"
import { ManufacturersListSearch } from "./toolbar-controls/manufacturers-list-search"
import { ManufacturersClearAll } from "./toolbar-controls/sub-controls/manufacturers-clear-all"
import { ManufacturersRowCount } from "./toolbar-controls/sub-controls/manufacturers-row-count"

export type ManufacturersClientProps = {
  initialSearchQuery: string
  initialPage: number
}

export default function ManufacturersClient({
  initialSearchQuery,
  initialPage,
}: ManufacturersClientProps) {
  const sidePanel = useManufacturerSidePanel()

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
  } = useFetchListController<ManufacturerListRow, ManufacturersListFilters>({
    mode: "fetch",
    queryKey: [...MANUFACTURERS_LIST_QUERY_KEY],
    listFn: listManufacturersRequest,
    initialSearchQuery,
    initialPage,
    pageSize: LIST_MANUFACTURERS_PAGE_SIZE,
    tableKey: "manufacturers-main",
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
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Manufacturers
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ManufacturersListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<ManufacturersClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<ManufacturersRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddManufacturerButton onClick={() => sidePanel.openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <ManufacturersTable
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

      <ManufacturerSidePanel controller={sidePanel} />
    </div>
  )
}
