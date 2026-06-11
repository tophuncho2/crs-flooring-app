"use client"

import { useMemo, useState } from "react"
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
import { DataTable, PaginateControls } from "@/engines/list-view"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation"
import { WORK_ORDERS_LIST_COLUMNS } from "@/modules/work-orders/components/list/table/work-orders-list-columns"
import { renderWorkOrderRowCell } from "@/modules/work-orders/components/list/table/work-orders-row-cell"
import {
  CONTACT_WORK_ORDERS_QUERY_KEY,
  contactWorkOrdersSectionRequest,
} from "@/modules/contacts/data/contact-work-orders-request"

const SECTION_PAGE_SIZE = 15

/**
 * Read-only Statistics section for the contact record view. ① the contact's
 * total labor cost (sum of ALL their labor payments) as a 2-col money cell ·
 * ② a paginated `DataTable` of the contact's work orders — the same columns the
 * work-order list renders. Clicking a row routes to that work order's record
 * view (with a `returnTo` back to this contact). Paginated at
 * {@link SECTION_PAGE_SIZE} rows per page. Mirrors `LinkedPropertiesList`.
 */
export function ContactStatisticsSection({ contactId }: { contactId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...CONTACT_WORK_ORDERS_QUERY_KEY, contactId, page],
    queryFn: ({ signal }) =>
      contactWorkOrdersSectionRequest(
        contactId,
        (page - 1) * SECTION_PAGE_SIZE,
        SECTION_PAGE_SIZE,
        signal,
      ),
  })

  const rows = useMemo<WorkOrderListRow[]>(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SECTION_PAGE_SIZE))
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
        <>
          <DataTable<WorkOrderListRow>
            rows={rows}
            columns={WORK_ORDERS_LIST_COLUMNS}
            renderCell={renderWorkOrderRowCell}
            empty={query.isLoading ? "Loading work orders…" : "No work orders yet."}
            onRowClick={(row) =>
              router.push(buildRecordDetailHref("/dashboard/work-orders", row.id, returnTo))
            }
            getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
          />
          {totalPages > 1 ? (
            <PaginateControls
              page={page}
              pageSize={SECTION_PAGE_SIZE}
              totalItems={total}
              totalPages={totalPages}
              hasPreviousPage={page > 1}
              hasNextPage={page < totalPages}
              onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-t border-[var(--panel-border)]"
            />
          ) : null}
        </>
      )}
    </RecordItemSection>
  )
}
