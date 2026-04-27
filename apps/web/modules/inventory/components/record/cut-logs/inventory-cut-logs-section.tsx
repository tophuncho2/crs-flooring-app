"use client"

import type { ReactNode } from "react"
import { Fragment } from "react"
import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import { CheckboxCell, CurrencyCell, TextCell, UnitCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import {
  formatCutLogStatus,
  formatInventoryQuantity,
  isCutLogPendingEditable,
  type CutLogRow,
  type FlooringCutLogStatus,
} from "@builders/domain"
import { VoidCutLogButton } from "@/components/cut-log-row-actions/void-cut-log-button"
import { CutLogLinksEditor } from "@/components/cut-log-row-actions/cut-log-links-editor"
import type { CutLogDraft } from "../../../controllers/drafts"

type GridDraftRow = CutLogDraft & { id: string }
type GridReadOnlyRow = CutLogRow & { id: string }

const CUT_LOG_GRID_LAYOUT: GridLayout<GridDraftRow> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "cut", label: "Cut", minWidth: 144, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 144, grow: 0, align: "center" },
    { key: "cost", label: "Cost", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "freight", label: "Freight", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "isWaste", label: "Waste", minWidth: 80, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "notes", label: "Notes", minWidth: 220, grow: 1.2 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 132 },
    { key: "actions", kind: "actions", width: 200 },
  ],
}

function statusTone(status: FlooringCutLogStatus): "default" | "processing" | "success" | "warning" {
  switch (status) {
    case "QUEUED":
      return "processing"
    case "FINAL":
      return "success"
    case "VOID":
      return "warning"
    case "PENDING":
      return "default"
  }
}

export function InventoryCutLogsSection({
  inventoryId,
  drafts,
  serverRows,
  stockUnitAbbrev,
  totalCutSum,
  isDirty,
  isSaving,
  hasConflict,
  sectionError,
  noticeMessage,
  noticeError,
  selectedIds,
  eligibleSelectedIds,
  isFinalizing,
  finalizeError,
  onSave,
  onDiscard,
  onAddRow,
  onRowFieldChange,
  onRemoveRow,
  onToggleSelection,
  onFinalizeSelected,
  onRowOptimisticUpdate,
}: {
  inventoryId: string
  drafts: CutLogDraft[]
  serverRows: CutLogRow[]
  stockUnitAbbrev: string
  totalCutSum: string
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  sectionError: ReactNode
  noticeMessage?: ReactNode
  noticeError?: ReactNode
  selectedIds: ReadonlySet<string>
  eligibleSelectedIds: string[]
  isFinalizing: boolean
  finalizeError: ReactNode
  onSave: () => void
  onDiscard: () => void
  onAddRow: () => void
  onRowFieldChange: <K extends Exclude<keyof CutLogDraft, "clientId">>(
    index: number,
    field: K,
    value: CutLogDraft[K],
  ) => void
  onRemoveRow: (index: number) => void
  onToggleSelection: (id: string) => void
  onFinalizeSelected: () => void
  /**
   * Called by per-row widgets (void, links) after a successful sync /
   * 202 to splice the updated row into local state. Same publish path
   * the section's diff-save uses for optimistic updates.
   */
  onRowOptimisticUpdate: (updatedRow: CutLogRow) => void
}) {
  const serverRowsById = new Map(serverRows.map((row) => [row.id, row]))
  const editableServerIds = new Set(
    serverRows.filter((row) => isCutLogPendingEditable(row)).map((row) => row.id),
  )

  // Drafts cover only the editable subset. Read-only rows render after
  // the draft section as a separate Fragment block.
  const editableGridRows: GridDraftRow[] = drafts.map((draft) => ({
    ...draft,
    id: draft.clientId,
  }))

  // Read-only rows (FINAL, VOID, QUEUED) show after the editable block.
  // Sort by cutLogNumber for stable user-perceived order.
  const readOnlyServerRows: GridReadOnlyRow[] = serverRows
    .filter((row) => !isCutLogPendingEditable(row))
    .map((row) => ({ ...row, id: row.id }))
    .sort((a, b) => (a.cutLogNumber < b.cutLogNumber ? -1 : 1))

  function findDraftIndex(clientId: string) {
    return drafts.findIndex((draft) => draft.clientId === clientId)
  }

  function isLocalDraft(row: GridDraftRow) {
    return row.clientId.startsWith("local:")
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Cut Logs"
        summary={
          <span>
            {drafts.length + readOnlyServerRows.length} log
            {drafts.length + readOnlyServerRows.length === 1 ? "" : "s"} ·{" "}
            {formatInventoryQuantity(totalCutSum, stockUnitAbbrev)} cut total
            {selectedIds.size > 0
              ? ` · ${selectedIds.size} selected (${eligibleSelectedIds.length} eligible)`
              : ""}
          </span>
        }
        status={
          eligibleSelectedIds.length > 0 && !isDirty
            ? {
                tone: "processing",
                label: "Ready to finalize",
                detail: "Worker will stamp before / after / finalCutSequence",
              }
            : undefined
        }
        actions={[
          {
            key: "add",
            label: "Add Row",
            onClick: onAddRow,
            kind: "secondary",
            disabled: isSaving || isFinalizing,
          },
          {
            key: "discard",
            label: "Discard",
            onClick: onDiscard,
            kind: "secondary",
            disabled: !isDirty || isSaving || isFinalizing,
          },
          {
            key: "save",
            label: isSaving ? "Saving Cuts..." : "Save Cuts",
            onClick: onSave,
            kind: "primary",
            disabled: !isDirty || isSaving || hasConflict || isFinalizing,
          },
          {
            key: "finalize",
            label: isFinalizing ? "Finalizing..." : "Finalize Selected",
            onClick: onFinalizeSelected,
            kind: "primary",
            // Per intent doc: finalize requires a clean slate. Disable
            // if the section is dirty.
            disabled:
              eligibleSelectedIds.length === 0 || isFinalizing || isSaving || isDirty,
          },
        ]}
        message={noticeMessage}
        error={sectionError ?? finalizeError ?? noticeError}
      />

      <Grid<GridDraftRow>
        rows={editableGridRows}
        layout={CUT_LOG_GRID_LAYOUT}
        empty={
          readOnlyServerRows.length === 0 ? (
            <GridEmpty>No cut logs yet. Click Add Row to start.</GridEmpty>
          ) : null
        }
        renderCell={(column, row) => {
          const index = findDraftIndex(row.clientId)
          const isLocal = isLocalDraft(row)
          // For server-saved drafts, the existing row's read-only fields
          // (cutLogNumber, before, after, coverageCut) come from the
          // server snapshot; locally-added drafts show placeholders.
          const serverRow = isLocal ? null : serverRowsById.get(row.clientId)

          switch (column.key) {
            case "cutLogNumber":
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.cutLogNumber ?? "(new)"}
                  ariaLabel={`Row ${index + 1} cut log number`}
                />
              )
            case "cut":
              return (
                <UnitCell
                  editable
                  value={row.cut}
                  onChange={(value) => onRowFieldChange(index, "cut", value)}
                  unit={stockUnitAbbrev}
                  ariaLabel={`Row ${index + 1} cut`}
                />
              )
            case "coverageCut":
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.coverageCut ?? "(computed)"}
                  ariaLabel={`Row ${index + 1} coverage cut`}
                />
              )
            case "cost":
              return (
                <CurrencyCell
                  editable={false}
                  value={serverRow?.cost ?? row.cost ?? ""}
                  ariaLabel={`Row ${index + 1} cost`}
                />
              )
            case "freight":
              return (
                <CurrencyCell
                  editable={false}
                  value={serverRow?.freight ?? row.freight ?? ""}
                  ariaLabel={`Row ${index + 1} freight`}
                />
              )
            case "isWaste":
              return (
                <CheckboxCell
                  editable
                  value={row.isWaste}
                  onChange={(value) => onRowFieldChange(index, "isWaste", value)}
                  ariaLabel={`Row ${index + 1} is waste`}
                />
              )
            case "before":
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.before ?? "—"}
                  ariaLabel={`Row ${index + 1} before`}
                />
              )
            case "after":
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.after ?? "—"}
                  ariaLabel={`Row ${index + 1} after`}
                />
              )
            case "finalSeq":
              return (
                <TextCell
                  editable={false}
                  value={
                    serverRow?.finalCutSequence != null
                      ? String(serverRow.finalCutSequence)
                      : "—"
                  }
                  ariaLabel={`Row ${index + 1} final sequence`}
                />
              )
            case "notes":
              return (
                <TextCell
                  editable
                  value={row.notes}
                  onChange={(value) => onRowFieldChange(index, "notes", value)}
                  ariaLabel={`Row ${index + 1} notes`}
                />
              )
            default:
              return null
          }
        }}
        renderControl={(control, row) => {
          const index = findDraftIndex(row.clientId)
          const isLocal = isLocalDraft(row)
          const serverRow = isLocal ? null : serverRowsById.get(row.clientId)
          const isServerSaved = Boolean(serverRow)
          const status = serverRow?.status ?? "PENDING"
          const isEligibleForSelect = isServerSaved && editableServerIds.has(row.clientId)

          if (control.kind === "selection") {
            return (
              <CheckboxCell
                editable={isEligibleForSelect}
                value={selectedIds.has(row.clientId)}
                onChange={() => onToggleSelection(row.clientId)}
                ariaLabel={`Select row ${index + 1}`}
              />
            )
          }
          if (control.kind === "status-indicator") {
            return (
              <StatusBadge tone={statusTone(status)}>{formatCutLogStatus(status)}</StatusBadge>
            )
          }
          if (control.kind === "actions") {
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRemoveRow(index)}
                  // Local drafts can be removed freely. Server-saved
                  // pending rows are removed via the deleted-row path of
                  // the diff save (still allowed). FINAL / VOID / QUEUED
                  // rows aren't in `drafts` at all, so this button only
                  // renders for editable rows.
                  aria-label={`Remove row ${index + 1}`}
                  className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
                {serverRow ? (
                  <Fragment>
                    <VoidCutLogButton
                      row={serverRow}
                      inventoryId={inventoryId}
                      onSuccess={onRowOptimisticUpdate}
                    />
                    <CutLogLinksEditor
                      row={serverRow}
                      inventoryId={inventoryId}
                      onSuccess={onRowOptimisticUpdate}
                    />
                  </Fragment>
                ) : null}
              </div>
            )
          }
          return null
        }}
      />

      {readOnlyServerRows.length > 0 ? (
        <div className="border-t border-[var(--panel-border)] bg-[var(--panel-background)]/50">
          <div className="px-4 py-3 text-xs uppercase tracking-wide text-[var(--foreground)]/60">
            Finalized / voided / in-flight ({readOnlyServerRows.length})
          </div>
          <ul className="divide-y divide-[var(--panel-border)]">
            {readOnlyServerRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--foreground)]/85"
              >
                <span className="font-medium">{row.cutLogNumber}</span>
                <span className="text-[var(--foreground)]/70">
                  {formatInventoryQuantity(row.cut, stockUnitAbbrev)}
                </span>
                <span className="text-[var(--foreground)]/60">
                  before {row.before} · after {row.after}
                  {row.finalCutSequence != null ? ` · seq ${row.finalCutSequence}` : ""}
                </span>
                {row.notes ? (
                  <span className="ml-2 truncate text-[var(--foreground)]/60">
                    {row.notes}
                  </span>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <StatusBadge tone={statusTone(row.status)}>
                    {formatCutLogStatus(row.status)}
                  </StatusBadge>
                  <VoidCutLogButton
                    row={row}
                    inventoryId={inventoryId}
                    onSuccess={onRowOptimisticUpdate}
                  />
                  <CutLogLinksEditor
                    row={row}
                    inventoryId={inventoryId}
                    onSuccess={onRowOptimisticUpdate}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
