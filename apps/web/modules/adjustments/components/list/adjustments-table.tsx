"use client"

import {
  DataTable,
  type DataTableRollup,
  type ListSelection,
  type PaginateContract,
} from "@/engines/list-view"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { ADJUSTMENTS_LIST_COLUMNS } from "./table/adjustments-list-columns"
import { renderAdjustmentsRowCell } from "./table/adjustments-row-cell"
import { renderAdjustmentRowActions } from "./table/adjustment-row-actions"

export function AdjustmentsTable({
  rows,
  onOpenAdjustment,
  onSplitOff,
  onDuplicate,
  onCreateReturn,
  selection,
  pagination,
  columnWidths,
  onColumnWidthsChange,
  rollups,
}: {
  rows: EnrichedInventoryAdjustmentRow[]
  onOpenAdjustment: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Add inventory from adjustment": open the split-off create form. */
  onSplitOff: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Duplicate adjustment": open the duplicate create modal seeded from the row. */
  onDuplicate: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row ⋮ → "Create return": open the Create Return modal seeded from the row. */
  onCreateReturn: (row: EnrichedInventoryAdjustmentRow) => void
  /** Row-selection state — drives the checkbox column + Select-All (CSV export scope). */
  selection?: ListSelection
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
  /** Pinned-footer totals (net quantity over the filtered set). */
  rollups?: ReadonlyArray<DataTableRollup>
}) {
  return (
    <DataTable<EnrichedInventoryAdjustmentRow>
      fill
      resizable
      rows={rows}
      columns={ADJUSTMENTS_LIST_COLUMNS}
      empty="No adjustments match these filters."
      rollups={rollups}
      selection={
        selection
          ? {
              selectedIds: selection.selectedIds,
              onToggleRow: selection.toggle,
              onToggleAll: (pageEligibleIds) => selection.toggleAll(pageEligibleIds),
              onClear: selection.clear,
            }
          : undefined
      }
      onOpenRow={(row) => onOpenAdjustment(row)}
      rowActions={(row) =>
        renderAdjustmentRowActions(row, { onSplitOff, onCreateReturn, onDuplicate })
      }
      getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
      renderCell={renderAdjustmentsRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
