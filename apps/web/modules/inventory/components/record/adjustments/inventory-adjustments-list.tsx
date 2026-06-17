"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Split } from "lucide-react"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { RecordOptionsMenu } from "@/engines/common"
import { ADJUSTMENTS_LIST_COLUMNS, renderAdjustmentsRowCell } from "@/modules/adjustments"
import {
  INVENTORY_ADJUSTMENTS_QUERY_KEY,
  inventoryAdjustmentsPageRequest,
} from "@/modules/inventory/data/inventory-adjustments-request"

const SECTION_PAGE_SIZE = 15

const PAGER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 disabled:cursor-default disabled:opacity-40"

/**
 * The list face of the inventory record view's adjustments drilldown section — a
 * list-view `DataTable` using the canonical {@link ADJUSTMENTS_LIST_COLUMNS} +
 * the shared `renderAdjustmentsRowCell` (the same primitives the `/dashboard/
 * adjustments` ledger renders). Each row opens via the leading `RecordOpenButton`
 * (↗) launch gutter — the row body is inert. The persistent `RecordItemSection`
 * chrome + "+ Adjustment" toolbar are owned by the host (`InventoryRecordView`).
 *
 * Paginated at {@link SECTION_PAGE_SIZE} per page. The page payload reports only
 * `hasMore` (no total), so the footer is a plain prev/next rather than a counted
 * pager.
 */
export function InventoryAdjustmentsList({
  inventoryId,
  onSelect,
  onSplitOff,
}: {
  inventoryId: string
  onSelect: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
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

  const showPager = page > 1 || hasMore

  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      renderCell={renderAdjustmentsRowCell}
      empty={query.isLoading ? "Loading adjustments…" : "No adjustments yet."}
      onOpenRow={(row) => onSelect(row)}
      rowActions={(row) => (
        <RecordOptionsMenu
          ariaLabel={`Options for adjustment ${row.adjustmentNumber}`}
          items={[
            {
              key: "split-off",
              label: "Add inventory from adjustment",
              icon: <Split size={14} aria-hidden="true" />,
              onClick: () => onSplitOff(row),
            },
          ]}
        />
      )}
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
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
