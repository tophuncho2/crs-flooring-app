"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LaborPaymentListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { ActionHeader } from "@/engines/common"
import type { HeaderAction } from "@/engines/common"
import { LABOR_PAYMENTS_LIST_COLUMNS } from "@/modules/labor-payments/components/list/table/labor-payments-list-columns"
import { renderLaborPaymentRowCell } from "@/modules/labor-payments/components/list/table/labor-payments-row-cell"
import {
  CONTACT_LABOR_PAYMENTS_QUERY_KEY,
  contactLaborPaymentsPageRequest,
} from "@/modules/contacts/data/contact-labor-payments-request"

const SECTION_PAGE_SIZE = 15

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

const PAGER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 disabled:cursor-default disabled:opacity-40"

/**
 * The list face of the contact record view's labor-payments drilldown section.
 * A columned `DataTable` — the same list-view primitive + columns + cell
 * renderer the standalone `/dashboard/labor-payments` ledger uses (incl. the
 * Work Order column) — so the embedded section surfaces the ledger's fields
 * rather than a bespoke slim subset. Mirrors `LinkedPropertiesList`.
 *
 * Paginated at {@link SECTION_PAGE_SIZE}; the page payload reports only
 * `hasMore` (no total), so the footer is a plain prev/next rather than a
 * counted pager. Row click drills into the payment's embedded edit view; the
 * header "+ Labor Payment" opens the create face.
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
        <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading labor payments…</p>
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Labor Payments" actions={headerActions} />
        <p className="px-4 py-6 text-sm text-rose-400">Could not load labor payments.</p>
      </div>
    )
  }

  const showPager = page > 1 || hasMore

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Labor Payments" actions={headerActions} />
      <DataTable<LaborPaymentListRow>
        rows={rows}
        columns={LABOR_PAYMENTS_LIST_COLUMNS}
        renderCell={renderLaborPaymentRowCell}
        empty="No labor payments yet."
        onOpenRow={(row) => onSelect(row)}
        getRowAriaLabel={(row) => `Edit labor payment ${row.description || row.id}`}
        className="rounded-none! border-0! shadow-none!"
      />
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
