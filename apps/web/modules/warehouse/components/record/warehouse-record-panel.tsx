"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  useRecordNotices,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type { WarehouseDetailRecord } from "@builders/db"
import { useWarehousePrimarySection } from "@/modules/warehouse/controllers/use-warehouse-primary-section"
import { WarehousePrimaryFieldsSection } from "./warehouse-primary-fields-section"

export function WarehouseRecordPanel({
  page,
  warehouse,
}: {
  page: RecordDetailClientScaffoldContext
  warehouse: WarehouseDetailRecord
}) {
  const notices = useRecordNotices()
  const controller = useWarehousePrimarySection({
    page,
    warehouse,
  })

  return (
    <RecordMultiSectionPanel
      page={page}
      notices={notices}
      sections={[
        {
          key: "primary",
          type: "field",
          slot: "primary",
          order: 0,
          dirtyLabel: "primary",
          controller: controller.primarySection,
          render: () => (
            <RecordPrimarySectionInstance
              title="Warehouse Details"
              error={controller.primarySection.error}
              noticeMessage={controller.primarySection.noticeMessage}
              noticeError={controller.primarySection.noticeError}
              isDirty={controller.primarySection.isDirty}
              isSaving={controller.primarySection.isSaving}
              hasConflict={controller.primarySection.hasConflict}
              onSave={() => void controller.primarySection.save()}
              onDiscard={controller.primarySection.discard}
              saveLabel="Save Warehouse"
              savingLabel="Saving Warehouse..."
              showHeader={false}
            >
              <WarehousePrimaryFieldsSection
                warehouse={controller.record}
                draft={controller.primarySection.localValue}
                disabled={controller.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Warehouse",
        deleteConfirmMessage: buildDeleteConfirmationMessage("warehouse"),
        onDelete: () => {
          void controller.deleteRecord?.()
        },
      }}
    />
  )
}
