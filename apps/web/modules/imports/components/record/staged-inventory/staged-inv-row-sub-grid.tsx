"use client"

import { useMemo, type ReactNode } from "react"
import type {
  FlooringStagedRowStatus,
  StagedInventoryFilterRow,
} from "@builders/domain"
import { StatusBadge } from "@/engines/common"
import type { BadgeTone } from "@/engines/common"
import { Grid, GridEmpty } from "@/engines/record-view"
import { MoneyCell, TextCell, UnitCell } from "@/engines/record-view"
import { isLocalOnlyRecordRow } from "@/engines/record-view"
import { resolveEffectiveStatus, type ImportStagedRowDraft } from "@/modules/imports/controllers/record/drafts"
import { STAGED_INV_ROW_LAYOUT, type StagedInvGridRow } from "./staged-inv-row-layout"
import {
  StagedRowDeleteButton,
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
  drafts: ReadonlyArray<ImportStagedRowDraft>
  /**
   * Live server status per saved staged row id. Read-only status is sourced
   * here (not from the draft) so the record controller's queued→imported poll
   * refreshes the badge + editability without a section rebase. Local-only
   * drafts are absent → fall back to the draft's own status (always DRAFT).
   */
  serverStatusById: Map<string, FlooringStagedRowStatus>
  selectedIds: Set<string>
  canToggleSelection: boolean
  isSectionBusy: boolean
  /** Local-only state ops — no API calls. */
  onAddRow: (filterClientId: string) => void
  onDuplicate: (filterClientId: string, sourceClientId: string) => void
  onDelete: (filterClientId: string, rowClientId: string) => void
  onSetField: (
    filterClientId: string,
    rowClientId: string,
    field: "rollNumber" | "startingStock" | "cost" | "freight" | "dyeLot" | "location" | "note",
    value: string,
  ) => void
  onToggleSelection: (rowId: string) => void
}

/**
 * Per-filter-row staged-inventory sub-grid. DRAFT rows are inline
 * editable (7 user fields); QUEUED/IMPORTED rows are read-only.
 * Duplicate + delete are local-only ops that mutate the section's
 * nested draft list — the combined section diff carries everything to
 * the server in one PATCH on Save.
 *
 * Selection (mark-for-import) uses real server ids only — local-only
 * drafts hide the checkbox.
 */
export function StagedInvRowSubGrid({
  filterRow,
  drafts,
  serverStatusById,
  selectedIds,
  canToggleSelection,
  isSectionBusy,
  onAddRow,
  onDuplicate,
  onDelete,
  onSetField,
  onToggleSelection,
}: StagedInvRowSubGridProps) {
  const filterClientId = filterRow.id

  // Effective status = live server status for saved rows, else the draft's own
  // (local-only DRAFT rows aren't in the server map yet).
  const effectiveStatus = (draft: ImportStagedRowDraft): FlooringStagedRowStatus =>
    resolveEffectiveStatus(serverStatusById, draft)

  const gridRows: StagedInvGridRow[] = useMemo(
    () => drafts.map((draft) => ({ id: draft.clientId, draft })),
    [drafts],
  )

  function renderCell(column: { key: string }, gridRow: StagedInvGridRow): ReactNode {
    const { draft } = gridRow
    const status = effectiveStatus(draft)
    const editable = status === "DRAFT" && !isSectionBusy
    switch (column.key) {
      case "status":
        return <StatusBadge tone={statusTone(status)}>{statusLabel(status)}</StatusBadge>
      case "product":
        return draft.productName || "—"
      case "rollNumber":
        return (
          <TextCell
            editable={editable}
            value={draft.rollNumber}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "rollNumber", next)}
            ariaLabel="Roll number"
          />
        )
      case "startingStock":
        return (
          <UnitCell
            editable={editable}
            value={draft.startingStock}
            onChange={(next) =>
              onSetField(filterClientId, draft.clientId, "startingStock", next)
            }
            unit={draft.stockUnitAbbrev || filterRow.stockUnitAbbrev || "unit"}
            ariaLabel="Starting stock"
          />
        )
      case "cost":
        return (
          <MoneyCell
            editable={editable}
            value={draft.cost}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "cost", next)}
            ariaLabel="Cost"
          />
        )
      case "freight":
        return (
          <MoneyCell
            editable={editable}
            value={draft.freight}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "freight", next)}
            ariaLabel="Freight"
          />
        )
      case "dyeLot":
        return (
          <TextCell
            editable={editable}
            value={draft.dyeLot}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "dyeLot", next)}
            ariaLabel="Dye lot"
          />
        )
      case "location":
        return (
          <TextCell
            editable={editable}
            value={draft.location}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "location", next)}
            ariaLabel="Location"
          />
        )
      case "note":
        return (
          <TextCell
            editable={editable}
            value={draft.note}
            onChange={(next) => onSetField(filterClientId, draft.clientId, "note", next)}
            ariaLabel="Note"
          />
        )
      default:
        return null
    }
  }

  function renderControl(
    control: { key: string; kind: string },
    gridRow: StagedInvGridRow,
  ): ReactNode {
    const { draft } = gridRow
    const isDraft = effectiveStatus(draft) === "DRAFT"
    const isLocal = isLocalOnlyRecordRow(draft.clientId)
    if (control.kind === "selection") {
      // Mark-for-import operates on saved rows only — hide the
      // checkbox on local-only drafts.
      if (isLocal) return null
      return (
        <StagedRowSelectCell
          editable={canToggleSelection && isDraft}
          isSelected={selectedIds.has(draft.clientId)}
          onToggle={() => onToggleSelection(draft.clientId)}
          ariaLabel={`Select row ${draft.rollNumber || draft.clientId}`}
        />
      )
    }
    if (control.kind === "actions") {
      return (
        <div className="flex items-center gap-1">
          <StagedRowDuplicateButton
            isDraft={isDraft}
            isSectionBusy={isSectionBusy}
            onClick={() => onDuplicate(filterClientId, draft.clientId)}
          />
          <StagedRowDeleteButton
            isDraft={isDraft}
            isSectionBusy={isSectionBusy}
            onClick={() => onDelete(filterClientId, draft.clientId)}
          />
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-3 border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <Grid<StagedInvGridRow>
        rows={gridRows}
        layout={STAGED_INV_ROW_LAYOUT}
        empty={<GridEmpty>No staged inventory rows under this filter.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
      />

      <StagedInvRowToolbar
        filterRow={filterRow}
        isSectionBusy={isSectionBusy}
        onCreateNew={(row) => onAddRow(row.id)}
      />
    </div>
  )
}
