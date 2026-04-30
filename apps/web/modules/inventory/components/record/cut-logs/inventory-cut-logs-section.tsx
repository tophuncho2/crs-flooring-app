"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import { CheckboxCell, CurrencyCell, TextCell, UnitCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { isLocalOnlyRecordRow } from "@/modules/shared/engines/record-view"
import {
  formatCutLogStatus,
  formatInventoryQuantity,
  type CutLogRow,
  type FlooringCutLogStatus,
} from "@builders/domain"
import type { CutLogDraft } from "../../../controllers/drafts"

type GridDraftRow = CutLogDraft & { id: string }

const CUT_LOG_GRID_LAYOUT: GridLayout<GridDraftRow> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "cut", label: "Cut", minWidth: 144, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 144, grow: 0, align: "center" },
    { key: "isWaste", label: "Waste", minWidth: 80, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "workOrder", label: "Work Order", minWidth: 140, grow: 0 },
    { key: "workOrderItem", label: "Material Item", minWidth: 140, grow: 0 },
    { key: "createdAt", label: "Created", minWidth: 156, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 156, grow: 0 },
    { key: "notes", label: "Notes", minWidth: 220, grow: 1.2 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 132 },
    { key: "actions", kind: "actions", width: 200 },
  ],
}

function statusTone(status: FlooringCutLogStatus): "default" | "processing" {
  return status === "QUEUED" ? "processing" : "default"
}

function formatTimestamp(iso: string | undefined | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function InventoryCutLogsSection({
  drafts,
  serverRows,
  stockUnitAbbrev,
  coverageUnitAbbrev,
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
}: {
  drafts: CutLogDraft[]
  serverRows: CutLogRow[]
  stockUnitAbbrev: string
  coverageUnitAbbrev: string
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
}) {
  const serverRowsById = new Map(serverRows.map((row) => [row.id, row]))
  // Pending section receives only PENDING + QUEUED rows after the panel
  // partition. Only PENDING rows are eligible for the finalize batch
  // action; QUEUED rows are awaiting worker resolution.
  const editableServerIds = new Set(
    serverRows.filter((row) => row.status === "PENDING").map((row) => row.id),
  )

  // One unified row stream: locally-added drafts + every server row
  // (PENDING / QUEUED / FINAL / VOID). Per-cell editability is decided
  // per row via `locked` derived from the server status. Mirrors the
  // staged-inv pattern.
  const gridRows: GridDraftRow[] = drafts.map((draft) => ({
    ...draft,
    id: draft.clientId,
  }))

  function findDraftIndex(clientId: string) {
    return drafts.findIndex((draft) => draft.clientId === clientId)
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Cut Logs"
        summary={
          <span>
            {drafts.length} log
            {drafts.length === 1 ? "" : "s"} ·{" "}
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
        rows={gridRows}
        layout={CUT_LOG_GRID_LAYOUT}
        empty={<GridEmpty>No cut logs yet. Click Add Row to start.</GridEmpty>}
        renderCell={(column, row) => {
          const index = findDraftIndex(row.clientId)
          const isLocal = isLocalOnlyRecordRow(row.clientId)
          const serverRow = isLocal ? null : serverRowsById.get(row.clientId) ?? null
          // Pending section sees only PENDING + QUEUED. Locked cells
          // belong to QUEUED rows awaiting worker resolution; PENDING
          // and local drafts stay editable.
          const locked = serverRow !== null && serverRow.status === "QUEUED"
          const editable = !locked

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
                  editable={editable}
                  value={row.cut}
                  onChange={(value) => onRowFieldChange(index, "cut", value)}
                  unit={stockUnitAbbrev}
                  ariaLabel={`Row ${index + 1} cut`}
                />
              )
            case "coverageCut":
              return (
                <UnitCell
                  editable={false}
                  value={serverRow?.coverageCut ?? ""}
                  unit={coverageUnitAbbrev}
                  ariaLabel={`Row ${index + 1} coverage cut`}
                />
              )
            case "isWaste":
              return (
                <CheckboxCell
                  editable={editable}
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
            case "workOrder":
              // Placeholder display — work-order option loader + picker
              // is a follow-up sweep. Today we surface the linked id (or
              // a dash) so the column never shifts width based on link
              // state.
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.workOrderId ?? "—"}
                  ariaLabel={`Row ${index + 1} work order`}
                />
              )
            case "workOrderItem":
              return (
                <TextCell
                  editable={false}
                  value={serverRow?.workOrderItemId ?? "—"}
                  ariaLabel={`Row ${index + 1} material item`}
                />
              )
            case "createdAt":
              return (
                <TextCell
                  editable={false}
                  value={formatTimestamp(serverRow?.createdAt)}
                  ariaLabel={`Row ${index + 1} created at`}
                />
              )
            case "updatedAt":
              return (
                <TextCell
                  editable={false}
                  value={formatTimestamp(serverRow?.updatedAt)}
                  ariaLabel={`Row ${index + 1} updated at`}
                />
              )
            case "notes":
              return (
                <TextCell
                  editable={editable}
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
          const isLocal = isLocalOnlyRecordRow(row.clientId)
          const serverRow = isLocal ? null : serverRowsById.get(row.clientId) ?? null
          const isServerSaved = Boolean(serverRow)
          const status: FlooringCutLogStatus = serverRow?.status ?? "PENDING"
          const isEligibleForSelect = isServerSaved && editableServerIds.has(row.clientId)
          const locked = serverRow !== null && serverRow.status === "QUEUED"

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
              <button
                type="button"
                onClick={() => onRemoveRow(index)}
                disabled={locked}
                aria-label={`Remove row ${index + 1}`}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✕
              </button>
            )
          }
          return null
        }}
      />
    </div>
  )
}
