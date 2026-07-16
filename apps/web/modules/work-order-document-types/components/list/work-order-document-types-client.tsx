"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  SearchControl,
  DebouncedSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { ListInput, WorkOrderDocumentTypesListFilters } from "@builders/application"
import {
  LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
  type WorkOrderDocumentTypeListRow,
} from "@builders/domain"
import {
  WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY,
  listWorkOrderDocumentTypesRequest,
} from "@/modules/work-order-document-types/data/list-work-order-document-types-request"
import { useWorkOrderDocumentTypesListController } from "@/modules/work-order-document-types/controllers/list/use-work-order-document-types-list-controller"
import { WorkOrderDocumentTypesTable } from "./work-order-document-types-table"

// The engine's filter map carries `string[]` only — wrap the scalar ROW-number
// search in a 1-element array, mirroring the entity-type / warehouse number bars.
type EngineWorkOrderDocumentTypeFilters = {
  workOrderDocumentTypeNumber?: ReadonlyArray<string>
}

const WORK_ORDER_DOCUMENT_TYPES_FILTERABLE_FIELDS = ["workOrderDocumentTypeNumber"] as const

function toEngineFilters(
  app: WorkOrderDocumentTypesListFilters,
): EngineWorkOrderDocumentTypeFilters {
  return app.workOrderDocumentTypeNumber
    ? { workOrderDocumentTypeNumber: [app.workOrderDocumentTypeNumber] }
    : {}
}

function toAppFilters(
  engine: EngineWorkOrderDocumentTypeFilters,
): WorkOrderDocumentTypesListFilters {
  const workOrderDocumentTypeNumber = engine.workOrderDocumentTypeNumber?.[0]?.trim()
  return workOrderDocumentTypeNumber ? { workOrderDocumentTypeNumber } : {}
}

export type WorkOrderDocumentTypesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: WorkOrderDocumentTypesListFilters
}

export default function WorkOrderDocumentTypesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: WorkOrderDocumentTypesClientProps) {
  const { message, pageError, openCreate, openWorkOrderDocumentType } =
    useWorkOrderDocumentTypesListController()

  // The engine's filter map carries `string[]` only — translate to the typed
  // scalar `WorkOrderDocumentTypesListFilters` at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineWorkOrderDocumentTypeFilters>) =>
      listWorkOrderDocumentTypesRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    searchQuery,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onFilterChange,
    onClearAllFilters,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<WorkOrderDocumentTypeListRow, EngineWorkOrderDocumentTypeFilters>({
    mode: "fetch",
    queryKey: [...WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
    tableKey: "work-order-document-types-main",
    filterableFields: WORK_ORDER_DOCUMENT_TYPES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const workOrderDocumentTypeNumberValue = filters.workOrderDocumentTypeNumber?.[0] ?? ""

  const handleWorkOrderDocumentTypeNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("workOrderDocumentTypeNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () =>
      searchQuery.trim().length > 0 || workOrderDocumentTypeNumberValue.trim().length > 0,
    [searchQuery, workOrderDocumentTypeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Document Type" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Document Types"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={
            searchQuery.trim().length > 0 ||
            workOrderDocumentTypeNumberValue.trim().length > 0
          }
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search document types"
          />
          <DebouncedSearchControl
            value={workOrderDocumentTypeNumberValue}
            onCommit={handleWorkOrderDocumentTypeNumberChange}
            placeholder="ROW #"
            ariaLabel="Search document types by number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <WorkOrderDocumentTypesTable
        rows={rows}
        onOpenWorkOrderDocumentType={(row) => openWorkOrderDocumentType(row.id)}
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
