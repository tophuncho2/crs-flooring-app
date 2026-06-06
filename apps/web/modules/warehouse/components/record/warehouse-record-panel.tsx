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
import type { WarehouseRow } from "@builders/domain"
import { useWarehousePrimarySection } from "@/modules/warehouse/controllers/record/primary/use-warehouse-primary-section"
import { WarehousePrimaryFieldsSection } from "./primary/warehouse-primary-fields-section"

export function WarehouseRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WarehouseRow
}) {
  const controller = useWarehousePrimarySection({ page, entry })
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
      dirtyLabel: "warehouse",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Warehouse"
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
          deleteLabel="Delete Warehouse"
          actionsLeading={<RecordBackButton onClick={page.closePage} label="Back" />}
        >
          <WarehousePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            number={record.number}
            workOrdersCount={record.workOrdersCount}
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
        title="Delete warehouse?"
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
