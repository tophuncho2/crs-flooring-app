"use client"

import { useCallback } from "react"
import {
  ListToolbar,
  ListToolbarCell,
  ListRowCount,
  DebouncedSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { ListInput, PaymentsListFilters } from "@builders/application"
import { LIST_PAYMENTS_PAGE_SIZE, type PaymentListRow } from "@builders/domain"
import {
  PAYMENTS_LIST_QUERY_KEY,
  listPaymentsRequest,
} from "@/modules/payments/data/list-payments-request"
import { usePaymentsListController } from "@/modules/payments/controllers/list/use-payments-list-controller"
import { PaymentsTable } from "./payments-table"

const PAYMENTS_FILTERABLE_FIELDS = ["paymentNumber", "amount"] as const

/**
 * Engine-side filter shape: the list-view engine's filter map only carries
 * `string[]` values (one per filterable field). The payments list's identity
 * bars — `paymentNumber` and `amount` — are free text, encoded here as
 * 1-element arrays, then translated to the typed `PaymentsListFilters` at the
 * listFn boundary below.
 */
type EnginePaymentsFilters = {
  paymentNumber?: ReadonlyArray<string>
  amount?: ReadonlyArray<string>
}

function toAppFilters(engine: EnginePaymentsFilters): PaymentsListFilters {
  const out: PaymentsListFilters = {}
  const paymentNumber = engine.paymentNumber?.[0]?.trim()
  if (paymentNumber) out.paymentNumber = paymentNumber
  const amount = engine.amount?.[0]?.trim()
  if (amount) out.amount = amount
  return out
}

export type PaymentsClientProps = {
  initialPage: number
}

export default function PaymentsClient({ initialPage }: PaymentsClientProps) {
  const { openPayment, openCreate } = usePaymentsListController()

  // The engine's filter map carries `string[]` only — translate to typed
  // PaymentsListFilters at the listFn boundary so the application layer sees
  // `paymentNumber: string` and `amount: string`.
  const adaptedListFn = useCallback(
    (input: ListInput<EnginePaymentsFilters>) =>
      listPaymentsRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onFilterChange,
  } = useFetchListController<PaymentListRow, EnginePaymentsFilters>({
    mode: "fetch",
    queryKey: [...PAYMENTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery: "",
    initialPage,
    initialFilters: {},
    pageSize: LIST_PAYMENTS_PAGE_SIZE,
    tableKey: "payments-main",
    filterableFields: PAYMENTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const paymentNumberValue = filters.paymentNumber?.[0] ?? ""
  const amountValue = filters.amount?.[0] ?? ""

  const handleTextFilterChange = useCallback(
    (key: "paymentNumber" | "amount", next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

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

          <ListToolbarCell>
            <DebouncedSearchControl
              value={paymentNumberValue}
              onCommit={(next) => handleTextFilterChange("paymentNumber", next)}
              placeholder="Payment #"
              ariaLabel="Search payments by payment number"
            />
            <DebouncedSearchControl
              value={amountValue}
              onCommit={(next) => handleTextFilterChange("amount", next)}
              placeholder="Amount"
              ariaLabel="Search payments by amount"
            />
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
