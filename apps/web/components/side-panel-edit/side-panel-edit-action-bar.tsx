"use client"

import type { ReactNode } from "react"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "@/components/panels/record-action-buttons"

export type SidePanelEditStatusBadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "processing"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function SidePanelEditStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: SidePanelEditStatusBadgeTone
  className?: string
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700"
      : tone === "warning"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-800"
        : tone === "error"
          ? "border-rose-500/35 bg-rose-500/10 text-rose-800"
          : tone === "processing"
            ? "border-blue-500/35 bg-blue-500/10 text-blue-800"
            : "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/75"

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SidePanelEditSaveStateIndicators({
  isDirty,
  isSaving,
  hasConflict,
  extra,
}: {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  extra?: ReactNode
}) {
  return (
    <>
      <SidePanelEditStatusBadge tone={isSaving ? "processing" : isDirty ? "warning" : "success"}>
        {isSaving ? "Saving" : isDirty ? "Dirty" : "Saved"}
      </SidePanelEditStatusBadge>
      {hasConflict ? <SidePanelEditStatusBadge tone="error">Conflict</SidePanelEditStatusBadge> : null}
      {extra}
    </>
  )
}

export type SidePanelEditActionBarProps = {
  isDirty: boolean
  isSaving: boolean
  hasConflict?: boolean
  canSave?: boolean
  canManage?: boolean
  onSave: () => void | Promise<void>
  onDiscard: () => void
  onDelete?: () => void | Promise<void>
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  showStatus?: boolean
  statusExtra?: ReactNode
  error?: ReactNode
}

/**
 * Footer action bar for `SidePanelPreview`-based edit panels. Mirrors the
 * record-view sub-header package (status pills + Save / Discard / Delete row)
 * but trimmed of section-type/capability machinery the side panel doesn't
 * need. The side panel's title bar already owns close; this bar owns mutate
 * + revert + delete + dirty status.
 */
export function SidePanelEditActionBar({
  isDirty,
  isSaving,
  hasConflict = false,
  canSave = true,
  canManage = true,
  onSave,
  onDiscard,
  onDelete,
  saveLabel = "Save",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  deleteLabel = "Delete",
  showStatus = true,
  statusExtra,
  error,
}: SidePanelEditActionBarProps) {
  const saveDisabled = !isDirty || isSaving || !canSave
  const discardDisabled = !isDirty || isSaving

  const statusContent = showStatus ? (
    <SidePanelEditSaveStateIndicators
      isDirty={isDirty}
      isSaving={isSaving}
      hasConflict={hasConflict}
      extra={statusExtra}
    />
  ) : null

  const managedActions = canManage ? (
    <>
      {onDelete ? (
        <RecordFooterDestructiveButton onClick={() => void onDelete()} disabled={isSaving}>
          {deleteLabel}
        </RecordFooterDestructiveButton>
      ) : null}
      <RecordFooterNeutralButton onClick={onDiscard} disabled={discardDisabled}>
        {discardLabel}
      </RecordFooterNeutralButton>
      <RecordFooterPrimaryButton onClick={() => void onSave()} disabled={saveDisabled}>
        {isSaving ? savingLabel : saveLabel}
      </RecordFooterPrimaryButton>
    </>
  ) : null

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        {statusContent ? (
          <div className="flex flex-wrap items-center gap-2">{statusContent}</div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
      {managedActions ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{managedActions}</div>
      ) : null}
    </div>
  )
}
