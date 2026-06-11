"use client"

import type { ReactNode } from "react"
import type { RecordSectionError } from "@/types/record/section-error"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordFooterPrimaryButton,
} from "../../shell/record-action-buttons"
import { RecordSectionActionPanel } from "../status/record-section-action-panel"
import { RecordSectionSaveStateIndicators } from "../status/record-section-status-indicators"
import {
  resolveRecordSectionCapabilities,
  type RecordSectionCapabilities,
  type RecordSectionType,
} from "./record-section-capabilities"

export type RecordSectionSubHeaderAction = {
  key: string
  label: string
  kind?: "custom" | "add-row" | "route-add" | "workflow"
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

export type RecordSectionSubHeaderProps = {
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
  /** Node rendered to the left of the action buttons (e.g. a lock notice). */
  actionsLeading?: ReactNode
  /** Node rendered to the right of the action buttons (e.g. an options menu). */
  actionsTrailing?: ReactNode
  statusExtra?: ReactNode
  canManage?: boolean
  showStatus?: boolean
  sectionType?: RecordSectionType
  capabilities?: RecordSectionCapabilities
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
  actionsLeading,
  actionsTrailing,
  statusExtra,
  canManage = true,
  showStatus = true,
  sectionType = "field",
  capabilities,
}: RecordSectionSubHeaderProps) {
  const resolvedCapabilities = resolveRecordSectionCapabilities(sectionType, capabilities)

  const configuredActions = actions
    .filter((action) => Boolean(action))
    .filter((action) => {
      if (action.kind === "add-row") {
        return resolvedCapabilities.supportsAddRow
      }

      if (action.kind === "route-add") {
        return resolvedCapabilities.supportsRouteAdd
      }

      return true
    })
    .map((action) => renderActionButton(action))

  const shouldRenderManagedActions = canManage && resolvedCapabilities.editable && resolvedCapabilities.supportsSaveDiscard

  const actionButtons = shouldRenderManagedActions ? (
    <>
      <RecordFooterPrimaryButton onClick={() => void onSave?.()} disabled={!isDirty || isSaving || !onSave}>
        {isSaving ? savingLabel : saveLabel}
      </RecordFooterPrimaryButton>
      <RecordFooterNeutralButton onClick={onDiscard} disabled={!isDirty || isSaving || !onDiscard}>
        {discardLabel}
      </RecordFooterNeutralButton>
      {configuredActions}
      {onDelete ? (
        <RecordFooterDestructiveButton onClick={() => void onDelete()} disabled={isSaving}>
          {deleteLabel}
        </RecordFooterDestructiveButton>
      ) : null}
    </>
  ) : configuredActions.length > 0 ? (
    <>{configuredActions}</>
  ) : null

  const managedActions =
    actionsLeading || actionButtons || actionsTrailing ? (
      <>
        {actionsLeading}
        {actionButtons}
        {actionsTrailing}
      </>
    ) : null

  const statusContent =
    showStatus && resolvedCapabilities.supportsSaveDiscard ? (
      <RecordSectionSaveStateIndicators
        isDirty={isDirty}
        isSaving={isSaving}
        hasConflict={hasConflict}
        extra={statusExtra}
      />
    ) : null

  return (
    <RecordSectionActionPanel
      summary={resolvedCapabilities.supportsSummary ? summary : null}
      error={error ?? null}
      status={statusContent}
      actions={managedActions}
    />
  )
}
