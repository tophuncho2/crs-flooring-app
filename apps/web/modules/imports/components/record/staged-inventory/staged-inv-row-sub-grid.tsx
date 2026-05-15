"use client"

import { useMemo, type ReactNode } from "react"
import type {
  FlooringStagedRowStatus,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import { StatusBadge } from "@/components/badges"
import type { BadgeTone } from "@/components/badges/contracts/badge-tone"
import { Grid, GridEmpty } from "@/components/grid"
import { STAGED_INV_ROW_LAYOUT, type StagedInvGridRow } from "./staged-inv-row-layout"
import {
  StagedRowDuplicateButton,
  StagedRowSelectCell,
} from "./row-controls"
import { StagedInvRowToolbar } from "./toolbar-controls"

function statusTone(status: FlooringStagedRowStatus): BadgeTone {
  switch (status) {
    case "QUEUED":
      return "processing"
    case "IMPORTED":
      return "success"
    default:
      return "default"
  }
}

function statusLabel(status: FlooringStagedRowStatus): string {
  switch (status) {
    case "QUEUED":
      return "Queued"
    case "IMPORTED":
      return "Imported"
    default:
      return "Draft"
  }
}

export type StagedInvRowSubGridProps = {
  filterRow: StagedInventoryFilterRow
  rows: ReadonlyArray<StagedInventoryRow>
  selectedIds: Set<string>
  canToggleSelection: boolean
  isSectionBusy: boolean
  onOpenEdit: (row: StagedInventoryRow, filterRow: StagedInventoryFilterRow) => void
  onCreateNew: (filterRow: StagedInventoryFilterRow) => void
  onDuplicate: (row: StagedInventoryRow) => void
  onToggleSelection: (rowId: string) => void
}

/**
 * Per-filter-row staged-inventory display sub-grid. Pure read-only —
 * every DRAFT row is a click target that opens the side panel for
 * edit. QUEUED + IMPORTED rows stay in the grid but are not
 * interactive (click no-ops, inline duplicate disabled). Selection
 * checkboxes are gated on filter-row clean state via
 * `canToggleSelection`.
 *
 * Mirrors `WorkOrderCutLogRow`'s pattern: nested `<Grid>` inside the
 * parent's `<ExpandableRow>` children, with a footer "+ Add Row"
 * button.
 */
export function StagedInvRowSubGrid({
  filterRow,
  rows,
  selectedIds,
  canToggleSelection,
  isSectionBusy,
  onOpenEdit,
  onCreateNew,
  onDuplicate,
  onToggleSelection,
}: StagedInvRowSubGridProps) {
  const gridRows: StagedInvGridRow[] = useMemo(
    () => rows.map((row) => ({ id: row.id, row })),
    [rows],
  )

  function renderCell(column: { key: string }, gridRow: StagedInvGridRow): ReactNode {
    const { row } = gridRow
    switch (column.key) {
      case "status":
        return <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
      case "rollNumber":
        return row.rollNumber ? `${row.rollPrefix}${row.rollNumber}` : "—"
      case "startingStock":
        return row.startingStock
          ? `${row.startingStock}${row.stockUnitAbbrev ? ` ${row.stockUnitAbbrev}` : ""}`
          : "—"
      case "dyeLot":
        return row.dyeLot || "—"
      case "location":
        return row.location || "—"
      case "note":
        return row.note || "—"
      default:
        return null
    }
  }

  function renderControl(
    control: { key: string; kind: string },
    gridRow: StagedInvGridRow,
  ): ReactNode {
    const { row } = gridRow
    const isDraft = row.status === "DRAFT"
    if (control.kind === "selection") {
      return (
        <StagedRowSelectCell
          editable={canToggleSelection && isDraft}
          isSelected={selectedIds.has(row.id)}
          onToggle={() => onToggleSelection(row.id)}
          ariaLabel={`Select row ${row.rollNumber || row.id}`}
        />
      )
    }
    if (control.kind === "actions") {
      return (
        <StagedRowDuplicateButton
          isDraft={isDraft}
          isSectionBusy={isSectionBusy}
          onClick={() => onDuplicate(row)}
        />
      )
    }
    return null
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <Grid<StagedInvGridRow>
        rows={gridRows}
        layout={STAGED_INV_ROW_LAYOUT}
        empty={<GridEmpty>No staged inventory rows under this filter.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
        onRowClick={(gridRow) => {
          if (gridRow.row.status !== "DRAFT") return
          onOpenEdit(gridRow.row, filterRow)
        }}
        getRowAriaLabel={(gridRow) =>
          gridRow.row.status === "DRAFT" ? `Edit staged row ${gridRow.row.rollNumber || ""}` : ""
        }
      />

      <StagedInvRowToolbar
        filterRow={filterRow}
        isSectionBusy={isSectionBusy}
        onCreateNew={onCreateNew}
      />
    </div>
  )
}
