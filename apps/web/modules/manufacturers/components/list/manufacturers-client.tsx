"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ManufacturersListFilters } from "@builders/application"
import {
  LIST_MANUFACTURERS_PAGE_SIZE,
  type ManufacturerListRow,
  type TablePreferencePayload,
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
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
}

export default function ManufacturersClient({
  initialTablePreferences,
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
  } = useServerListController<ManufacturerListRow, ManufacturersListFilters>({
    mode: "fetch",
    queryKey: [...MANUFACTURERS_LIST_QUERY_KEY],
    listFn: listManufacturersRequest,
    initialSearchQuery,
    initialPage,
    pageSize: LIST_MANUFACTURERS_PAGE_SIZE,
    tableKey: "manufacturers-main",
    initialTablePreferences,
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
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Manufacturers" />

        <ListToolbar>
          <ListToolbarCell>
            <ManufacturersListSearch
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
            />
            <ListToolbarBottomRow
              left={<ManufacturersClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
              right={<ManufacturersRowCount count={rows.length} total={total} />}
            />
          </ListToolbarCell>

          {/* Right-anchored action: + Manufacturer occupies the top row of
              a single right-anchored cell; the bottom row is empty (no
              secondary create flow). */}
          <ListToolbarCell className="ml-auto">
            <AddManufacturerButton onClick={() => sidePanel.openCreate()} />
          </ListToolbarCell>
        </ListToolbar>

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
      </div>

      <ManufacturerSidePanel controller={sidePanel} />
    </div>
  )
}
