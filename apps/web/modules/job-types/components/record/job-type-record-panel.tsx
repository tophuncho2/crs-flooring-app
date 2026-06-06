"use client"

import { useState } from "react"
import {
  RecordBackButton,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import type { JobType } from "@builders/domain"
import { useJobTypePrimarySection } from "@/modules/job-types/controllers/record/primary/use-job-type-primary-section"
import { JobTypePrimaryFieldsSection } from "./primary/job-type-primary-fields-section"

export function JobTypeRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: JobType
}) {
  const controller = useJobTypePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await controller.deleteRecord()
    } finally {
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "job type",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Job Type"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          onDelete={() => setConfirmDeleteOpen(true)}
          deleteLabel="Delete Job Type"
          actionsLeading={<RecordBackButton onClick={page.closePage} label="Back" />}
        >
          <JobTypePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete job type?"
        message="This cannot be undone."
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmDeleteOpen(false)
        }}
      />
    </>
  )
}
