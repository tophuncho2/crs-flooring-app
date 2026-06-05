"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { Grid, GridEmpty } from "@/components/grid"
import { ActionHeader } from "@/components/headers"
import type { HeaderAction } from "@/components/headers/contracts/header-action"
import { INVENTORY_ADJUSTMENT_LAYOUT, renderAdjustmentReadOnlyCell } from "@/modules/adjustments"
import {
  INVENTORY_ADJUSTMENTS_QUERY_KEY,
  inventoryAdjustmentsPageRequest,
} from "@/modules/inventory/data/inventory-adjustments-request"

const SECTION_PAGE_SIZE = 15

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

const PAGER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 disabled:cursor-default disabled:opacity-40"

/**
 * The list face of the inventory record view's adjustments drilldown section. A
 * `Grid` using the canonical {@link INVENTORY_ADJUSTMENT_LAYOUT} columns + the
 * shared `renderAdjustmentReadOnlyCell` — the same column set the work-orders
 * material-items adjustment grid renders. Row click drills into that
 * adjustment's embedded edit view; the header "+ Adjustment" opens create.
 *
 * Paginated at {@link SECTION_PAGE_SIZE} per page. The page payload reports only
 * `hasMore` (no total), so the footer is a plain prev/next rather than a counted
 * pager.
 */
export function InventoryAdjustmentsList({
  inventoryId,
  onSelect,
  onCreate,
}: {
  inventoryId: string
  onSelect: (row: EnrichedInventoryAdjustmentRow) => void
  onCreate: () => void
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
  const renderCell = useMemo(() => renderAdjustmentReadOnlyCell({}), [])

  const headerActions: ReadonlyArray<HeaderAction> = [
    { key: "add-adjustment", label: "+ Adjustment", kind: "primary", onClick: onCreate },
  ]

  if (query.isLoading) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Adjustments" actions={headerActions} />
        <p className="p-4 text-sm text-[var(--foreground)]/60">Loading adjustments…</p>
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Adjustments" actions={headerActions} />
        <p className="p-4 text-sm text-rose-400">Could not load adjustments.</p>
      </div>
    )
  }

  const showPager = page > 1 || hasMore

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Adjustments" actions={headerActions} />
      <div className="p-4">
        <Grid<EnrichedInventoryAdjustmentRow>
          rows={rows}
          layout={INVENTORY_ADJUSTMENT_LAYOUT}
          empty={<GridEmpty>No adjustments yet.</GridEmpty>}
          renderCell={renderCell}
          onRowClick={(row) => onSelect(row)}
          getRowAriaLabel={(row) => `Edit adjustment ${row.adjustmentNumber}`}
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
