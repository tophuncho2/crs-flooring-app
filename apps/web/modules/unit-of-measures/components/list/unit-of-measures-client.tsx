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
import { useRecordEntryNavigation } from "@/hooks/navigation"
import {
  UNIT_OF_MEASURES_LIST_QUERY_KEY,
  listUnitOfMeasuresRequest,
} from "@/modules/unit-of-measures/data/list-unit-of-measures-request"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

export type UnitOfMeasuresClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search;
// rows open a read-only detail. Units of measure are a seed-sourced reference
// catalog (no user CRUD yet).
export default function UnitOfMeasuresClient({ initialPage }: UnitOfMeasuresClientProps) {
  const { openRecord } = useRecordEntryNavigation("/dashboard/unit-of-measures")
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
    <ListPageShell fill>
      <ListHeaderPortal
        label="Unit Of Measures"
      />
      <UnitOfMeasuresTable
        rows={rows}
        onOpenUnitOfMeasure={(row) => openRecord(row.id)}
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
