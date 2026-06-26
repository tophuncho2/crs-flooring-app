"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ToolbarMenuButton,
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
    onClearAllFilters,
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

  const hasActiveFilters = useMemo(
    () => Boolean(paymentNumberValue || amountValue),
    [paymentNumberValue, amountValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  // Payments has no full-text search — its two identity bars (each matches
  // exact on its own column) live in a single Search menu. No gutter "Menu":
  // the table stays bare until CSV export lands.
  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Payment" onClick={openCreate} />

      <ListActionBar
        label="Payments"
        rowCount={rows.length}
        total={total}
        rowCountLabel="payments"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveFilters}
          bodyClassName="w-[15rem] normal-case tracking-normal"
        >
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
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
