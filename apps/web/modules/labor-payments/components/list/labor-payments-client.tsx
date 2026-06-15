"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls, ListToolbar, ListToolbarBottomRow, ListToolbarCell, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { LaborPaymentsListFilters } from "@builders/application"
import {
  LIST_LABOR_PAYMENTS_PAGE_SIZE,
  type LaborPaymentListRow,
} from "@builders/domain"
import {
  LABOR_PAYMENTS_LIST_QUERY_KEY,
  listLaborPaymentsRequest,
} from "@/modules/labor-payments/data/list-labor-payments-request"
import { useLaborPaymentsListController } from "@/modules/labor-payments/controllers/list/use-labor-payments-list-controller"
import { LaborPaymentsTable } from "./labor-payments-table"
import { LaborPaymentCreateEntry } from "./toolbar-controls/labor-payment-create-entry"
import { LaborPaymentsListSearch } from "./toolbar-controls/labor-payments-list-search"
import { LaborPaymentsCostSearch } from "./toolbar-controls/labor-payments-cost-search"
import { LaborPaymentsClearAll } from "./toolbar-controls/sub-controls/labor-payments-clear-all"
import { LaborPaymentsRowCount } from "./toolbar-controls/sub-controls/labor-payments-row-count"

const LABOR_PAYMENTS_FILTERABLE_FIELDS = ["cost"] as const

export type LaborPaymentsClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: LaborPaymentsListFilters
}

export default function LaborPaymentsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: LaborPaymentsClientProps) {
  const { message, pageError, openCreateForContact, openLaborPayment } = useLaborPaymentsListController()

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
    filters,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<LaborPaymentListRow, LaborPaymentsListFilters>({
    mode: "fetch",
    queryKey: [...LABOR_PAYMENTS_LIST_QUERY_KEY],
    listFn: listLaborPaymentsRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_LABOR_PAYMENTS_PAGE_SIZE,
    tableKey: "labor-payments-main",
    filterableFields: LABOR_PAYMENTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const costFilter = filters.cost?.[0] ?? ""

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || costFilter.length > 0,
    [searchQuery, costFilter],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
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

        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Labor Payments
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <LaborPaymentsListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <LaborPaymentsCostSearch
                  value={costFilter}
                  onCommit={(next) => onFilterChange("cost", next ? [next] : [])}
                />
                <ListToolbarBottomRow
                  left={
                    <LaborPaymentsClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<LaborPaymentsRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <LaborPaymentCreateEntry onPick={openCreateForContact} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <LaborPaymentsTable
        rows={rows}
        onOpenLaborPayment={(row) => openLaborPayment(row)}
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
