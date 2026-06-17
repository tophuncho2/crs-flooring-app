"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LaborPaymentListRow } from "@builders/domain"
import { DataTable, useRecordSectionPagination } from "@/engines/list-view"
import { LABOR_PAYMENTS_LIST_COLUMNS } from "@/modules/labor-payments/components/list/table/labor-payments-list-columns"
import { renderLaborPaymentRowCell } from "@/modules/labor-payments/components/list/table/labor-payments-row-cell"
import {
  CONTACT_LABOR_PAYMENTS_QUERY_KEY,
  contactLaborPaymentsPageRequest,
} from "@/modules/contacts/data/contact-labor-payments-request"

/**
 * The list face of the contact record view's labor-payments drilldown section —
 * a columned `DataTable` using the same list-view columns + cell renderer the
 * standalone `/dashboard/labor-payments` ledger uses (incl. the Work Order
 * column). Each row opens via row click into the payment's embedded edit view;
 * the inert row body is the drilldown trigger. The persistent `RecordItemSection`
 * chrome + "+ Labor Payment" toolbar are owned by the host (`ContactRecordView`).
 *
 * Pagination is engine-owned: {@link useRecordSectionPagination} holds the page
 * state and derives the always-on counted footer from the page payload's `total`.
 */
export function ContactLaborPaymentsList({
  contactId,
  onSelect,
}: {
  contactId: string
  onSelect: (row: LaborPaymentListRow) => void
}) {
  const pager = useRecordSectionPagination()

  const query = useQuery({
    queryKey: [...CONTACT_LABOR_PAYMENTS_QUERY_KEY, contactId, "record-section", pager.page],
    queryFn: ({ signal }) =>
      contactLaborPaymentsPageRequest(contactId, pager.skip, pager.pageSize, signal),
  })

  const rows = useMemo<LaborPaymentListRow[]>(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0

  if (query.isError) {
    return <p className="text-sm text-rose-400">Could not load labor payments.</p>
  }

  return (
    <DataTable<LaborPaymentListRow>
      rows={rows}
      columns={LABOR_PAYMENTS_LIST_COLUMNS}
      renderCell={renderLaborPaymentRowCell}
      empty={query.isLoading ? "Loading labor payments…" : "No labor payments yet."}
      onOpenRow={(row) => onSelect(row)}
      getRowAriaLabel={(row) => `Edit labor payment ${row.description || row.id}`}
      pagination={pager.toContract(total)}
    />
  )
}
