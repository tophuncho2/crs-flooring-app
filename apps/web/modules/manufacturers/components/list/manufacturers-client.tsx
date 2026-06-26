"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  SearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { ManufacturersListFilters } from "@builders/application"
import {
  LIST_MANUFACTURERS_PAGE_SIZE,
  type ManufacturerListRow,
} from "@builders/domain"
import {
  MANUFACTURERS_LIST_QUERY_KEY,
  listManufacturersRequest,
} from "@/modules/manufacturers/data/list-manufacturers-request"
import { useManufacturersListController } from "@/modules/manufacturers/controllers/list/use-manufacturers-list-controller"
import { ManufacturersTable } from "./manufacturers-table"

export type ManufacturersClientProps = {
  initialSearchQuery: string
  initialPage: number
}

export default function ManufacturersClient({
  initialSearchQuery,
  initialPage,
}: ManufacturersClientProps) {
  const { openCreate, openManufacturer } = useManufacturersListController()

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
    <ListPageShell>
      <ListCreateButtonPortal label="Manufacturer" onClick={() => openCreate()} />

      <ListActionBar
        label="Manufacturers"
        rowCount={rows.length}
        total={total}
        rowCountLabel="manufacturers"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton label="Search" icon={Search} active={hasActiveFilters}>
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search manufacturers"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <ManufacturersTable
        rows={rows}
        onOpen={(row) => openManufacturer(row.id)}
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
      />
    </ListPageShell>
  )
}
