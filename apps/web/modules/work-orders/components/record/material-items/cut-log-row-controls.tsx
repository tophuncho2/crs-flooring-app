"use client"

import type { ReactNode } from "react"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges"
import { CheckboxCell, CircularCommitButton } from "@/components/cells"
import { ConfirmActionButton } from "@/components/features/confirm-action"
import { renderCutLogStatusControl } from "@/components/features/cut-log-row"
import type { GridControlColumn } from "@/components/grid/contracts/grid-control-column"
import type { PendingCutLogRowController } from "@/modules/work-orders/controllers/record/material-items/use-pending-cut-log-section"

type DestructiveCopy = {
  label: string
  pendingLabel: string
  confirmTitle: string
  confirmMessage: ReactNode
  confirmLabel: string
  ariaLabel: string
}

function pickDestructiveCopy(
  status: FlooringCutLogStatus | "DRAFT",
  cutLogNumber: string,
): DestructiveCopy {
  if (status === "FINAL") {
    return {
      label: "Void",
      pendingLabel: "Voiding…",
      confirmTitle: `Void ${cutLogNumber}?`,
      confirmMessage:
        "Voiding marks this finalized cut log as no longer counted; the row stays in the history with its original sequence number. This cannot be undone.",
      confirmLabel: "Void cut log",
      ariaLabel: `Void cut ${cutLogNumber}`,
    }
  }
  return {
    label: status === "DRAFT" ? "Discard" : "Delete",
    pendingLabel: "Deleting…",
    confirmTitle: status === "DRAFT" ? "Discard draft?" : `Delete ${cutLogNumber}?`,
    confirmMessage:
      status === "DRAFT"
        ? "Discards the unsaved draft row."
        : "This pending cut log will be removed. Final cuts cannot be deleted — they can only be voided.",
    confirmLabel: status === "DRAFT" ? "Discard" : "Delete cut log",
    ariaLabel: `Remove cut ${cutLogNumber}`,
  }
}

export function renderCutLogDestructiveCell(
  rc: PendingCutLogRowController,
  isSectionBusy: boolean,
): ReactNode {
  const cutLogNumber = rc.row?.cutLogNumber ?? "draft"
  const copy = pickDestructiveCopy(rc.destructiveStatus, cutLogNumber)

  if (rc.kind === "draft") {
    return (
      <ConfirmActionButton
        label={copy.label}
        ariaLabel={copy.ariaLabel}
        buttonTone="destructive"
        editable={!isSectionBusy}
        confirmTitle={copy.confirmTitle}
        confirmMessage={copy.confirmMessage}
        confirmLabel={copy.confirmLabel}
        confirmTone="destructive"
        pendingLabel={copy.pendingLabel}
        onConfirm={async () => {
          rc.discardDraft()
        }}
      />
    )
  }

  const disabledTitle =
    rc.destructiveStatus === "VOID"
      ? "Already voided"
      : rc.destructiveStatus === "QUEUED"
        ? "Cut log is in flight; refresh to see latest state"
        : undefined
  return (
    <ConfirmActionButton
      label={
        rc.commitState === "pending" && rc.destructiveStatus !== "PENDING"
          ? copy.pendingLabel
          : copy.label
      }
      ariaLabel={copy.ariaLabel}
      buttonTone="destructive"
      editable={rc.destructiveEnabled && !isSectionBusy}
      title={disabledTitle}
      confirmTitle={copy.confirmTitle}
      confirmMessage={copy.confirmMessage}
      confirmLabel={copy.confirmLabel}
      confirmTone="destructive"
      pendingLabel={copy.pendingLabel}
      onConfirm={async () => {
        rc.fireDestructive()
      }}
    />
  )
}

export type CutLogSelectionContext = {
  selectedIds: ReadonlySet<string>
  onToggleSelected: (cutLogId: string) => void
  canToggleSelection: boolean
  isSectionBusy: boolean
}

export function renderCutLogSelectionControl(
  rc: PendingCutLogRowController,
  ctx: CutLogSelectionContext,
): ReactNode {
  if (rc.kind === "draft" || !rc.row) return null
  const status = rc.row.status as FlooringCutLogStatus
  if (status !== "PENDING") return null
  const row = rc.row
  return (
    <CheckboxCell
      editable={ctx.canToggleSelection && !ctx.isSectionBusy}
      value={ctx.selectedIds.has(row.id)}
      onChange={() => ctx.onToggleSelected(row.id)}
      ariaLabel={`Select cut ${row.cutLogNumber}`}
    />
  )
}

export function renderCutLogStatusBadge(
  control: GridControlColumn,
  rc: PendingCutLogRowController,
): ReactNode {
  if (rc.kind === "draft" || !rc.row) {
    return <CutLogStatusBadge status={"PENDING" as FlooringCutLogStatus} />
  }
  return renderCutLogStatusControl(control, rc.row as CutLogRow)
}

export function renderCutLogCommitControl(
  rc: PendingCutLogRowController,
  isSectionBusy: boolean,
): ReactNode {
  const cutLogNumber = rc.row?.cutLogNumber ?? "new draft"
  const title =
    rc.commitState === "pristine"
      ? "No changes to save"
      : rc.commitState === "pending"
        ? "Saving…"
        : rc.commitState === "success"
          ? "Saved"
          : "Save row"
  return (
    <CircularCommitButton
      editable={!isSectionBusy}
      state={rc.commitState}
      title={title}
      ariaLabel={`Save cut ${cutLogNumber}`}
      onClick={rc.commit}
    />
  )
}
