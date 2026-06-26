"use client"

import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import {
  LIST_UNIT_OF_MEASURES_PAGE_SIZE,
  type UnitOfMeasureListRow,
} from "@builders/domain"
import {
  UNIT_OF_MEASURES_LIST_QUERY_KEY,
  listUnitOfMeasuresRequest,
} from "@/modules/unit-of-measures/data/list-unit-of-measures-request"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

export type UnitOfMeasuresClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search,
// no row-open — units of measure are a small reference catalog.
export default function UnitOfMeasuresClient({ initialPage }: UnitOfMeasuresClientProps) {
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
  } = useFetchListController<UnitOfMeasureListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...UNIT_OF_MEASURES_LIST_QUERY_KEY],
    listFn: listUnitOfMeasuresRequest,
    initialPage,
    pageSize: LIST_UNIT_OF_MEASURES_PAGE_SIZE,
    tableKey: "unit-of-measures-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell>
      <ListHeaderPortal
        label="Unit Of Measures"
        rowCount={rows.length}
        total={total}
        rowCountLabel="units of measure"
      />
      <UnitOfMeasuresTable
        rows={rows}
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
