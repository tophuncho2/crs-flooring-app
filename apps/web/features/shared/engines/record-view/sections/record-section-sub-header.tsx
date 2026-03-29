"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "../contracts"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "../shell/record-action-buttons"
import { RecordSectionActionPanel } from "./record-section-action-panel"
import { RecordSectionSaveStateIndicators } from "./record-section-status-indicators"

export type RecordSectionSubHeaderAction = {
  key: string
  label: string
  tone?: "neutral" | "primary" | "destructive"
  onClick: () => void | Promise<void>
  disabled?: boolean
}

function renderActionButton(action: RecordSectionSubHeaderAction) {
  const commonProps = {
    onClick: () => void action.onClick(),
    disabled: action.disabled,
    children: action.label,
  }

  if (action.tone === "destructive") {
    return <RecordFooterDestructiveButton key={action.key} {...commonProps} />
  }

  if (action.tone === "primary") {
    return <RecordFooterPrimaryButton key={action.key} {...commonProps} />
  }

  return <RecordFooterNeutralButton key={action.key} {...commonProps} />
}

export function RecordSectionSubHeader({
  summary,
  error,
  isDirty,
  isSaving,
  hasConflict,
  onSave,
  onDiscard,
  onDelete,
  saveLabel = "Save",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  deleteLabel = "Delete",
  actions = [],
  statusExtra,
  canManage = true,
}: {
  summary?: ReactNode
  error?: ReactNode | RecordSectionError | null
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  onSave?: () => void | Promise<void>
  onDiscard?: () => void
  onDelete?: () => void | Promise<void>
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  actions?: RecordSectionSubHeaderAction[]
  statusExtra?: ReactNode
  canManage?: boolean
}) {
  const configuredActions = actions
    .filter((action) => Boolean(action))
    .map((action) => renderActionButton(action))

  const managedActions = canManage ? (
    <>
      {configuredActions}
      {onDelete ? (
        <RecordFooterDestructiveButton onClick={() => void onDelete()} disabled={isSaving}>
          {deleteLabel}
        </RecordFooterDestructiveButton>
      ) : null}
      <RecordFooterNeutralButton onClick={onDiscard} disabled={!isDirty || isSaving || !onDiscard}>
        {discardLabel}
      </RecordFooterNeutralButton>
      <RecordFooterPrimaryButton onClick={() => void onSave?.()} disabled={!isDirty || isSaving || !onSave}>
        {isSaving ? savingLabel : saveLabel}
      </RecordFooterPrimaryButton>
    </>
  ) : configuredActions.length > 0 ? (
    <>{configuredActions}</>
  ) : null

  return (
    <RecordSectionActionPanel
      summary={summary}
      error={error ?? null}
      status={
        <RecordSectionSaveStateIndicators
          isDirty={isDirty}
          isSaving={isSaving}
          hasConflict={hasConflict}
          extra={statusExtra}
        />
      }
      actions={managedActions}
    />
  )
}
