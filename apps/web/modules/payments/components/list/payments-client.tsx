"use client"

import {
  ListToolbar,
  ListToolbarCell,
  ListRowCount,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { PaymentsListFilters } from "@builders/application"
import { LIST_PAYMENTS_PAGE_SIZE, type PaymentListRow } from "@builders/domain"
import {
  PAYMENTS_LIST_QUERY_KEY,
  listPaymentsRequest,
} from "@/modules/payments/data/list-payments-request"
import { usePaymentsListController } from "@/modules/payments/controllers/list/use-payments-list-controller"
import { PaymentsTable } from "./payments-table"

const PAYMENTS_FILTERABLE_FIELDS = [] as const

export type PaymentsClientProps = {
  initialPage: number
}

export default function PaymentsClient({ initialPage }: PaymentsClientProps) {
  const { openPayment, openCreate } = usePaymentsListController()

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
  } = useFetchListController<PaymentListRow, PaymentsListFilters>({
    mode: "fetch",
    queryKey: [...PAYMENTS_LIST_QUERY_KEY],
    listFn: listPaymentsRequest,
    initialSearchQuery: "",
    initialPage,
    initialFilters: {},
    pageSize: LIST_PAYMENTS_PAGE_SIZE,
    tableKey: "payments-main",
    filterableFields: PAYMENTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div className="px-4 pt-3">
          <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
            Payments
          </span>
        </div>
        <ListToolbar className="pt-0" showDivider={false}>
          <ListToolbarCell>
            <ListRowCount count={rows.length} total={total} label="payments" />
          </ListToolbarCell>

          <ListToolbarCell className="ml-auto">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md border border-[var(--panel-border)] bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-500/25"
            >
              + Payment
            </button>
          </ListToolbarCell>
        </ListToolbar>
      </div>

      <PaymentsTable
        rows={rows}
        onOpenPayment={(row) => openPayment(row)}
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
    </div>
  )
}
