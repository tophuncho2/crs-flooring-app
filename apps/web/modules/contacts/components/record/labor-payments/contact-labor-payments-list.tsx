"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LaborPaymentListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { LABOR_PAYMENTS_LIST_COLUMNS } from "@/modules/labor-payments/components/list/table/labor-payments-list-columns"
import { renderLaborPaymentRowCell } from "@/modules/labor-payments/components/list/table/labor-payments-row-cell"
import {
  CONTACT_LABOR_PAYMENTS_QUERY_KEY,
  contactLaborPaymentsPageRequest,
} from "@/modules/contacts/data/contact-labor-payments-request"

const SECTION_PAGE_SIZE = 15

const PAGER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 disabled:cursor-default disabled:opacity-40"

/**
 * The list face of the contact record view's labor-payments drilldown section —
 * a columned `DataTable` using the same list-view columns + cell renderer the
 * standalone `/dashboard/labor-payments` ledger uses (incl. the Work Order
 * column). Each row opens via row click into the payment's embedded edit view;
 * the inert row body is the drilldown trigger. The persistent `RecordItemSection`
 * chrome + "+ Labor Payment" toolbar are owned by the host (`ContactRecordView`).
 *
 * Paginated at {@link SECTION_PAGE_SIZE}; the page payload reports only
 * `hasMore` (no total), so the footer is a plain prev/next rather than a counted
 * pager.
 */
export function ContactLaborPaymentsList({
  contactId,
  onSelect,
}: {
  contactId: string
  onSelect: (row: LaborPaymentListRow) => void
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

  if (query.isError) {
    return <p className="text-sm text-rose-400">Could not load labor payments.</p>
  }

  const showPager = page > 1 || hasMore

  return (
    <DataTable<LaborPaymentListRow>
      rows={rows}
      columns={LABOR_PAYMENTS_LIST_COLUMNS}
      renderCell={renderLaborPaymentRowCell}
      empty={query.isLoading ? "Loading labor payments…" : "No labor payments yet."}
      onOpenRow={(row) => onSelect(row)}
      getRowAriaLabel={(row) => `Edit labor payment ${row.description || row.id}`}
      footerSlot={
        showPager ? (
          <div className="flex items-center justify-between">
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
        ) : null
      }
    />
  )
}
