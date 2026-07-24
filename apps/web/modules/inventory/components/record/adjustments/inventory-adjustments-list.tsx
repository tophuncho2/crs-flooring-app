"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import {
  RecordDeleteDialog,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
} from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import {
  ADJUSTMENTS_LIST_COLUMNS,
  renderAdjustmentRowActions,
  renderAdjustmentsRowCell,
} from "@/modules/adjustments"
import { useDeleteAdjustmentMutation } from "@/modules/inventory/controllers/record/adjustments/mutations"
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
  onCreateReturn,
  onDeleted,
}: {
  inventoryId: string
  onSelect: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Duplicate adjustment": open the create modal seeded from the row. */
  onDuplicate?: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Create return": open the Create Return modal seeded from this row (adds the WO link). */
  onCreateReturn?: (row: EnrichedInventoryAdjustmentRow) => void
  /** Strong-reconcile callback fired after a row delete commits (balances + caches). */
  onDeleted?: () => void
}) {
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<EnrichedInventoryAdjustmentRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useDeleteAdjustmentMutation({
    onDeleted: () => {
      setPendingDelete(null)
      onDeleted?.()
    },
    onError: (err) =>
      setDeleteError(getClientErrorMessage(err, "Failed to delete adjustment")),
  })

  const del = useRecordDeleteConfirmation(async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync({ adjustment: pendingDelete })
    } catch {
      // Surfaced inline via `deleteError` (the mutation's onError).
    }
  })

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
    <>
      {deleteError ? <p className="mb-2 text-sm text-rose-400">{deleteError}</p> : null}
      <DataTable<EnrichedInventoryAdjustmentRow>
        flush
        rows={rows}
        columns={ADJUSTMENTS_LIST_COLUMNS}
        renderCell={renderAdjustmentsRowCell}
        empty={query.isLoading ? "Loading adjustments…" : "No adjustments yet."}
        onOpenRow={(row) => onSelect(row)}
        rowActions={(row) =>
          renderAdjustmentRowActions(row, {
            onSplitOff,
            onDuplicate,
            onCreateReturn,
            onDelete: (target) => {
              setDeleteError(null)
              setPendingDelete(target)
              del.requestDelete()
            },
          })
        }
        getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
        cursorPagination={{
          page,
          hasPreviousPage: page > 1,
          hasNextPage: hasMore,
          onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
          onNextPage: () => setPage((p) => p + 1),
        }}
      />
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete adjustment?"
        message={buildDeleteConfirmationMessage("adjustment")}
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </>
  )
}
