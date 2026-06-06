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
import type { ManufacturerRow } from "@builders/domain"
import { useManufacturerPrimarySection } from "@/modules/manufacturers/controllers/record/primary/use-manufacturer-primary-section"
import { ManufacturerPrimaryFieldsSection } from "./primary/manufacturer-primary-fields-section"

export function ManufacturerRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManufacturerRow
}) {
  const controller = useManufacturerPrimarySection({ page, entry })
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
      dirtyLabel: "manufacturer",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Manufacturer"
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
          deleteLabel="Delete Manufacturer"
          actionsLeading={<RecordBackButton onClick={page.closePage} label="Back" />}
        >
          <ManufacturerPrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            productsCount={record.productsCount}
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
        title="Delete manufacturer?"
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
