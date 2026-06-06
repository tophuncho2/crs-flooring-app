"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
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
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Manufacturer"
        confirmTitle="Delete manufacturer?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
