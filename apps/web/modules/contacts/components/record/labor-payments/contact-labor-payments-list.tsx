"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LaborPaymentListRow } from "@builders/domain"
import { Grid, GridEmpty } from "@/engines/record-view"
import { ActionHeader } from "@/engines/common"
import type { HeaderAction } from "@/engines/common"
import {
  CONTACT_LABOR_PAYMENTS_QUERY_KEY,
  contactLaborPaymentsPageRequest,
} from "@/modules/contacts/data/contact-labor-payments-request"
import {
  LABOR_PAYMENT_SECTION_LAYOUT,
  renderLaborPaymentSectionCell,
} from "./labor-payment-section-grid"

const SECTION_PAGE_SIZE = 15

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

const PAGER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 disabled:cursor-default disabled:opacity-40"

/**
 * The list face of the contact record view's labor-payments drilldown section.
 * A `Grid` (Unit / Description / Cost / Created) paginated at
 * {@link SECTION_PAGE_SIZE}; the page payload reports only `hasMore`, so the
 * footer is a plain prev/next. Row click drills into the payment's embedded edit
 * view; the header "+ Labor Payment" opens the create face. Mirrors
 * `InventoryAdjustmentsList`.
 */
export function ContactLaborPaymentsList({
  contactId,
  onSelect,
  onCreate,
}: {
  contactId: string
  onSelect: (row: LaborPaymentListRow) => void
  onCreate: () => void
}) {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...CONTACT_LABOR_PAYMENTS_QUERY_KEY, contactId, "record-section", page],
    queryFn: ({ signal }) =>
      contactLaborPaymentsPageRequest(
        contactId,
        (page - 1) * SECTION_PAGE_SIZE,
        SECTION_PAGE_SIZE,
        signal,
      ),
  })

  const rows = useMemo<LaborPaymentListRow[]>(() => query.data?.rows ?? [], [query.data])
  const hasMore = query.data?.hasMore ?? false

  const headerActions: ReadonlyArray<HeaderAction> = [
    { key: "add-labor-payment", label: "+ Labor Payment", kind: "primary", onClick: onCreate },
  ]

  if (query.isLoading) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Labor Payments" actions={headerActions} />
        <p className="p-4 text-sm text-[var(--foreground)]/60">Loading labor payments…</p>
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Labor Payments" actions={headerActions} />
        <p className="p-4 text-sm text-rose-400">Could not load labor payments.</p>
      </div>
    )
  }

  const showPager = page > 1 || hasMore

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Labor Payments" actions={headerActions} />
      <div className="p-4">
        <Grid<LaborPaymentListRow>
          rows={rows}
          layout={LABOR_PAYMENT_SECTION_LAYOUT}
          empty={<GridEmpty>No labor payments yet.</GridEmpty>}
          renderCell={renderLaborPaymentSectionCell}
          onRowClick={(row) => onSelect(row)}
          getRowAriaLabel={(row) => `Edit labor payment ${row.description || row.id}`}
        />
      </div>
      {showPager ? (
        <div className="flex items-center justify-between border-t border-[var(--panel-border)] px-4 py-2">
          <span className="text-xs text-[var(--foreground)]/55">Page {page}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={PAGER_BUTTON_CLASS}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <button
              type="button"
              className={PAGER_BUTTON_CLASS}
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
