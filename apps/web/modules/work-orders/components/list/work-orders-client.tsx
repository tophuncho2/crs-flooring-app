"use client"

import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { WorkOrderListRow } from "@builders/domain"
import {
  WORK_ORDERS_LIST_PAGE_SIZE,
  WORK_ORDERS_LIST_QUERY_KEY,
  listWorkOrdersRequest,
} from "@/modules/work-orders/data/list-work-orders-request"
import { useWorkOrdersListController } from "@/modules/work-orders/controllers/use-work-orders-list-controller"
import { WorkOrdersTable } from "./work-orders-table"

const WORK_ORDERS_ALLOWED_SORT_FIELDS = ["workOrderNumber"] as const

export default function WorkOrdersClient({
  initialSearchQuery,
  initialIsAscendingSort,
  initialPage,
}: {
  initialSearchQuery: string
  initialIsAscendingSort: boolean
  initialPage: number
}) {
  const { message, pageError, openCreate, openWorkOrder } = useWorkOrdersListController()

  const {
    rows,
    total,
    searchQuery,
    sort,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onToggleSortDirection,
  } = useServerListController<WorkOrderListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY],
    listFn: listWorkOrdersRequest,
    initialSearchQuery,
    initialSort: {
      field: "workOrderNumber",
      direction: initialIsAscendingSort ? "asc" : "desc",
    },
    initialGroupField: null,
    initialPage,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    tableKey: "work-orders-main",
    initialTablePreferences: null,
    allowedSortFields: WORK_ORDERS_ALLOWED_SORT_FIELDS,
    allowedGroupFields: [],
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const isAscendingSort = sort?.direction !== "desc"

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Work Orders"
          actions={[
            { key: "new", label: "+ Work Order", onClick: () => openCreate(), kind: "primary" },
          ]}
        />

        {message || pageError ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {pageError ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {pageError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search work order # or unit"
            />
          </div>
          <SortToggle
            sortKey="workOrderNumber"
            direction={isAscendingSort ? "asc" : "desc"}
            onChange={() => onToggleSortDirection()}
            ascendingLabel="A-Z"
            descendingLabel="Z-A"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} work orders
          </span>
        </div>

        <WorkOrdersTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenWorkOrder={openWorkOrder}
        />
      </div>
    </div>
  )
}
