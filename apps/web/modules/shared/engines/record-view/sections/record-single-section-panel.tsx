"use client"

import type { ReactNode } from "react"
import { Fragment, useCallback, useMemo } from "react"
import { buildRecordActionConfirmationMessage, confirmRecordAction } from "../client"
import type { RecordDetailClientScaffoldContext } from "../client/record-detail-client-scaffold"
import type { RecordSectionError } from "../contracts"
import type { RecordPanelFooterConfig, RecordPanelSectionConfig } from "../panel"
import { RecordPanelRenderer } from "../panel"
import { RecordPanelFooter } from "../shell/record-panel-footer"
import { RecordFieldSection } from "./record-field-section"
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
  page?: RecordDetailClientScaffoldContext
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
  footer,
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
  footer?: RecordPanelFooterConfig
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
  const section = useMemo(
    () => (
      <RecordFieldSection
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
      </RecordFieldSection>
    ),
    [
      canManage,
      children,
      controller.deleteRecord,
      controller.primarySection.discard,
      controller.primarySection.error,
      controller.primarySection.hasConflict,
      controller.primarySection.isDirty,
      controller.primarySection.isSaving,
      controller.primarySection.noticeError,
      controller.primarySection.noticeMessage,
      deleteLabel,
      discardLabel,
      handleDelete,
      handleSave,
      metrics,
      saveLabel,
      savingLabel,
      showHeader,
      summary,
      title,
    ],
  )

  const sections = useMemo<RecordPanelSectionConfig[]>(
    () => [
      {
        key: "primary",
        type: "field",
        slot: "primary",
        order: 0,
        dirtyLabel: "primary",
        controller: controller.primarySection,
        render: () => section,
      },
    ],
    [controller.primarySection, section],
  )

  if (controller.page) {
    return (
      <RecordPanelRenderer
        page={controller.page}
        sections={sections}
        footer={footer}
      />
    )
  }

  return (
    <Fragment>
      <RecordSectionStack>{isOpen ? section : null}</RecordSectionStack>
      {footer ? (
        <RecordPanelFooter
          deleteLabel={footer.deleteLabel}
          deleteConfirmMessage={footer.deleteConfirmMessage}
          onDelete={footer.onDelete}
          onClose={footer.onClose ?? (() => undefined)}
        />
      ) : null}
    </Fragment>
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
