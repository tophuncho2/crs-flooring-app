"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ActionHeader } from "@/components/headers"
import {
  INVENTORY_CUT_LOG_LAYOUT,
  renderCutLogReadOnlyCell,
} from "@/modules/cut-logs"
import { Grid, GridEmpty } from "@/components/grid"
import {
  INVENTORY_CUT_LOG_PAGE_SIZE,
  formatInventoryQuantity,
  type InventoryCutLogRow,
} from "@builders/domain"
import {
  INVENTORY_CUT_LOGS_QUERY_KEY,
  inventoryCutLogsPageRequest,
} from "@/modules/inventory/data/inventory-cut-logs-request"

export type InventoryCutLogsSectionProps = {
  inventoryId: string
  stockUnitAbbrev: string
  coverageUnitAbbrev: string
  totalCutSum: string
  onRowClick: (cutLog: InventoryCutLogRow) => void
}

/**
 * Cut-log section for the inventory record view. Fetches its own page of
 * cut logs from the paginated `/api/inventory/[id]/cut-logs` endpoint —
 * the parent panel no longer threads cut-log rows in. Mutations on the
 * shared edit panel invalidate this section's query so the visible page
 * refetches after a save / void / delete.
 *
 * Server sort: pending-like rows first (`finalCutSequence = null`,
 * ordered by createdAt asc), then finalized rows by `finalCutSequence`
 * desc so the most-recently-finalized cut leads. VOID-after-FINAL keeps
 * its sequence and stays interleaved with FINAL rows.
 */
export function InventoryCutLogsSection({
  inventoryId,
  stockUnitAbbrev,
  coverageUnitAbbrev,
  totalCutSum,
  onRowClick,
}: InventoryCutLogsSectionProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [inventoryId])

  const query = useQuery({
    queryKey: [...INVENTORY_CUT_LOGS_QUERY_KEY, inventoryId, page],
    queryFn: ({ signal }) =>
      inventoryCutLogsPageRequest(inventoryId, page, INVENTORY_CUT_LOG_PAGE_SIZE, signal),
    staleTime: 0,
    gcTime: 0,
  })

  const renderCell = useMemo(
    () =>
      renderCutLogReadOnlyCell({
        stockUnitFallback: stockUnitAbbrev,
        coverageUnitFallback: coverageUnitAbbrev,
      }),
    [stockUnitAbbrev, coverageUnitAbbrev],
  )

  const data = query.data
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? INVENTORY_CUT_LOG_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showPagination = total > pageSize
  const prevDisabled = page <= 1 || query.isFetching
  const nextDisabled = page >= totalPages || query.isFetching

  const summaryParts = [
    `${total} log${total === 1 ? "" : "s"}`,
    `${formatInventoryQuantity(totalCutSum, stockUnitAbbrev)} cut total`,
  ]

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader title="Cut Logs" summary={<span>{summaryParts.join(" · ")}</span>} />

      <Grid<InventoryCutLogRow>
        rows={rows}
        layout={INVENTORY_CUT_LOG_LAYOUT}
        empty={
          <GridEmpty>
            {query.isError
              ? "Could not load cut logs."
              : query.isLoading
                ? "Loading cut logs…"
                : "No cut logs on this inventory."}
          </GridEmpty>
        }
        renderCell={renderCell}
        onRowClick={onRowClick}
        getRowAriaLabel={(row) => `View cut log ${row.cutLogNumber}`}
      />

      {showPagination ? (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-border)] px-4 py-2 text-xs text-[var(--foreground)]/65">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={prevDisabled}
            className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
          >
            Prev
          </button>
          <span className="tabular-nums text-[var(--foreground)]/55">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={nextDisabled}
            className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
