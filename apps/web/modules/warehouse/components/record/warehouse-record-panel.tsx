"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
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
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Warehouse"
        confirmTitle="Delete warehouse?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
