"use client"

import type { ReactNode } from "react"
import { useCallback } from "react"
import { buildRecordActionConfirmationMessage, confirmRecordAction } from "../client"
import type { RecordSectionError } from "../contracts"
import { RecordPrimarySectionInstance } from "./record-primary-section-instance"
import { RecordSectionStack } from "./record-section-stack"

type SingleSectionState = {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error: ReactNode | RecordSectionError | null
  noticeMessage?: string
  noticeError?: string
  save: () => boolean | void | Promise<boolean | void>
  discard: () => void
}

type SingleSectionController = {
  page?: {
    isPrimarySectionOpen: boolean
  }
  primarySection: SingleSectionState
  deleteRecord?: () => Promise<boolean>
}

export function RecordSingleSectionPanel({
  title,
  controller,
  children,
  metrics,
  summary,
  canManage = true,
  showHeader = false,
  saveLabel = "Save",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  deleteLabel = "Delete",
  deleteConfirmationMessage,
}: {
  title: string
  controller: SingleSectionController
  children: ReactNode
  metrics?: ReactNode
  summary?: ReactNode
  canManage?: boolean
  showHeader?: boolean
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  deleteLabel?: string
  deleteConfirmationMessage?: string
}) {
  const handleDelete = useCallback(async () => {
    if (!controller.deleteRecord) {
      return
    }

    if (deleteConfirmationMessage && !confirmRecordAction(deleteConfirmationMessage)) {
      return
    }

    await controller.deleteRecord()
  }, [controller, deleteConfirmationMessage])

  const handleSave = useCallback(async () => {
    await controller.primarySection.save()
  }, [controller.primarySection])

  const isOpen = controller.page?.isPrimarySectionOpen ?? true

  return (
    <RecordSectionStack>
      {isOpen ? (
        <RecordPrimarySectionInstance
          title={title}
          metrics={metrics}
          summary={summary}
          error={controller.primarySection.error}
          noticeMessage={controller.primarySection.noticeMessage}
          noticeError={controller.primarySection.noticeError}
          isDirty={controller.primarySection.isDirty}
          isSaving={controller.primarySection.isSaving}
          hasConflict={controller.primarySection.hasConflict}
          canManage={canManage}
          onSave={handleSave}
          onDiscard={controller.primarySection.discard}
          onDelete={controller.deleteRecord ? handleDelete : undefined}
          saveLabel={saveLabel}
          savingLabel={savingLabel}
          discardLabel={discardLabel}
          deleteLabel={deleteLabel}
          showHeader={showHeader}
        >
          {children}
        </RecordPrimarySectionInstance>
      ) : null}
    </RecordSectionStack>
  )
}

export function buildSingleSectionDeleteConfirmationMessage(input: {
  entityLabel: string
  description?: string
}) {
  return buildRecordActionConfirmationMessage({
    title: `Delete this ${input.entityLabel}?`,
    summary: input.description,
    warning: "This cannot be undone.",
  })
}
