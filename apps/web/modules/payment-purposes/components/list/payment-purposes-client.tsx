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
import type { ListInput, PaymentPurposesListFilters } from "@builders/application"
import {
  LIST_PAYMENT_PURPOSES_PAGE_SIZE,
  type PaymentPurposeListRow,
} from "@builders/domain"
import {
  PAYMENT_PURPOSES_LIST_QUERY_KEY,
  listPaymentPurposesRequest,
} from "@/modules/payment-purposes/data/list-payment-purposes-request"
import { usePaymentPurposesListController } from "@/modules/payment-purposes/controllers/list/use-payment-purposes-list-controller"
import { PaymentPurposesTable } from "./payment-purposes-table"

// The engine's filter map carries `string[]` only — wrap the scalar ROW-number
// search in a 1-element array, mirroring the entity-type / warehouse number bars.
type EnginePaymentPurposeFilters = {
  paymentPurposeNumber?: ReadonlyArray<string>
}

const PAYMENT_PURPOSES_FILTERABLE_FIELDS = ["paymentPurposeNumber"] as const

function toEngineFilters(app: PaymentPurposesListFilters): EnginePaymentPurposeFilters {
  return app.paymentPurposeNumber ? { paymentPurposeNumber: [app.paymentPurposeNumber] } : {}
}

function toAppFilters(engine: EnginePaymentPurposeFilters): PaymentPurposesListFilters {
  const paymentPurposeNumber = engine.paymentPurposeNumber?.[0]?.trim()
  return paymentPurposeNumber ? { paymentPurposeNumber } : {}
}

export type PaymentPurposesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: PaymentPurposesListFilters
}

export default function PaymentPurposesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: PaymentPurposesClientProps) {
  const { message, pageError, openCreate, openPaymentPurpose } = usePaymentPurposesListController()

  // The engine's filter map carries `string[]` only — translate to the typed
  // scalar `PaymentPurposesListFilters` at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EnginePaymentPurposeFilters>) =>
      listPaymentPurposesRequest({
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
  } = useFetchListController<PaymentPurposeListRow, EnginePaymentPurposeFilters>({
    mode: "fetch",
    queryKey: [...PAYMENT_PURPOSES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_PAYMENT_PURPOSES_PAGE_SIZE,
    tableKey: "payment-purposes-main",
    filterableFields: PAYMENT_PURPOSES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const paymentPurposeNumberValue = filters.paymentPurposeNumber?.[0] ?? ""

  const handlePaymentPurposeNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("paymentPurposeNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || paymentPurposeNumberValue.trim().length > 0,
    [searchQuery, paymentPurposeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Payment Purpose" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Payment Purposes"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={searchQuery.trim().length > 0 || paymentPurposeNumberValue.trim().length > 0}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search payment purposes"
          />
          <DebouncedSearchControl
            value={paymentPurposeNumberValue}
            onCommit={handlePaymentPurposeNumberChange}
            placeholder="ROW #"
            ariaLabel="Search payment purposes by number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <PaymentPurposesTable
        rows={rows}
        onOpenPaymentPurpose={(row) => openPaymentPurpose(row.id)}
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
