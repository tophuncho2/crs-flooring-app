"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { WorkOrderListRow } from "@builders/domain"
import {
  CellAt,
  FieldSection,
  FormField,
  MoneyCell,
  RecordItemSection,
} from "@/engines/record-view"
import { DataTable, useRecordSectionPagination } from "@/engines/list-view"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation"
import { WORK_ORDERS_LIST_COLUMNS } from "@/modules/work-orders/components/list/table/work-orders-list-columns"
import { renderWorkOrderRowCell } from "@/modules/work-orders/components/list/table/work-orders-row-cell"
import {
  CONTACT_WORK_ORDERS_QUERY_KEY,
  contactWorkOrdersSectionRequest,
} from "@/modules/contacts/data/contact-work-orders-request"

/**
 * Read-only Statistics section for the contact record view. ① the contact's
 * total labor cost (sum of ALL their labor payments) as a 2-col money cell ·
 * ② a paginated `DataTable` of the contact's work orders — the same columns the
 * work-order list renders. Clicking a row routes to that work order's record
 * view (with a `returnTo` back to this contact). Pagination is engine-owned via
 * {@link useRecordSectionPagination}. Mirrors `LinkedPropertiesList`.
 */
export function ContactStatisticsSection({ contactId }: { contactId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const pager = useRecordSectionPagination()

  const query = useQuery({
    queryKey: [...CONTACT_WORK_ORDERS_QUERY_KEY, contactId, pager.page],
    queryFn: ({ signal }) =>
      contactWorkOrdersSectionRequest(contactId, pager.skip, pager.pageSize, signal),
  })

  const rows = useMemo<WorkOrderListRow[]>(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const laborCostTotal = query.data?.laborCostTotal ?? ""

  return (
    <RecordItemSection title="Statistics">
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={2}>
          <FormField label="Total Labor Cost">
            <MoneyCell editable={false} value={laborCostTotal} ariaLabel="Total labor cost" />
          </FormField>
        </CellAt>
      </FieldSection>

      {query.isError ? (
        <p className="text-sm text-rose-400">Could not load work orders.</p>
      ) : (
        <DataTable<WorkOrderListRow>
          rows={rows}
          columns={WORK_ORDERS_LIST_COLUMNS}
          renderCell={renderWorkOrderRowCell}
          empty={query.isLoading ? "Loading work orders…" : "No work orders yet."}
          onOpenRow={(row) =>
            router.push(buildRecordDetailHref("/dashboard/work-orders", row.id, returnTo))
          }
          getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
          pagination={pager.toContract(total)}
        />
      )}
    </RecordItemSection>
  )
}
