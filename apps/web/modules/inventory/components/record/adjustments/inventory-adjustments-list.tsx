"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import {
  ADJUSTMENTS_LIST_COLUMNS,
  renderAdjustmentRowActions,
  renderAdjustmentsRowCell,
} from "@/modules/adjustments"
import {
  INVENTORY_ADJUSTMENTS_QUERY_KEY,
  inventoryAdjustmentsPageRequest,
} from "@/modules/inventory/data/inventory-adjustments-request"

const SECTION_PAGE_SIZE = 15

/**
 * The list face of the inventory record view's adjustments drilldown section — a
 * list-view `DataTable` using the canonical {@link ADJUSTMENTS_LIST_COLUMNS} +
 * the shared `renderAdjustmentsRowCell` (the same primitives the `/dashboard/
 * adjustments` ledger renders). Each row opens via the leading `RecordOpenButton`
 * (↗) launch gutter — the row body is inert. The persistent `RecordItemSection`
 * chrome + "+ Adjustment" toolbar are owned by the host (`InventoryRecordView`).
 *
 * Paginated at {@link SECTION_PAGE_SIZE} per page. The page payload reports only
 * `hasMore` (no total), so it drives the engine's cursor pager
 * (`DataTable cursorPagination`) — an always-on prev/next footer (visible from
 * page one, Next disabled when there's no more) — rather than a counted pager.
 */
export function InventoryAdjustmentsList({
  inventoryId,
  onSelect,
  onSplitOff,
  onDuplicate,
}: {
  inventoryId: string
  onSelect: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Duplicate adjustment": open the create modal seeded from the row (PENDING only). */
  onDuplicate?: (row: EnrichedInventoryAdjustmentRow) => void
}) {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...INVENTORY_ADJUSTMENTS_QUERY_KEY, inventoryId, "record-section", page],
    queryFn: ({ signal }) =>
      inventoryAdjustmentsPageRequest(
        inventoryId,
        (page - 1) * SECTION_PAGE_SIZE,
        SECTION_PAGE_SIZE,
        signal,
      ),
  })

  const rows = useMemo<EnrichedInventoryAdjustmentRow[]>(() => query.data?.rows ?? [], [query.data])
  const hasMore = query.data?.hasMore ?? false

  if (query.isError) {
    return <p className="text-sm text-rose-400">Could not load adjustments.</p>
  }

  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      renderCell={renderAdjustmentsRowCell}
      empty={query.isLoading ? "Loading adjustments…" : "No adjustments yet."}
      onOpenRow={(row) => onSelect(row)}
      rowActions={(row) => renderAdjustmentRowActions(row, { onSplitOff, onDuplicate })}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      cursorPagination={{
        page,
        hasPreviousPage: page > 1,
        hasNextPage: hasMore,
        onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
        onNextPage: () => setPage((p) => p + 1),
      }}
    />
  )
}
