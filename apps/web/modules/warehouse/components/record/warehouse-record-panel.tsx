"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  useRecordNotices,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type { WarehouseDetail } from "@/modules/warehouse/types"
import { useWarehousePrimarySection } from "@/modules/warehouse/controllers/use-warehouse-primary-section"
import { useWarehouseSectionsSection } from "@/modules/warehouse/controllers/use-warehouse-sections-section"
import { WarehousePrimaryFieldsSection } from "./warehouse-primary-fields-section"
import { WarehouseSectionsSection } from "./warehouse-sections-section"

export function WarehouseRecordPanel({
  page,
  warehouse,
}: {
  page: RecordDetailClientScaffoldContext
  warehouse: WarehouseDetail
}) {
  const notices = useRecordNotices()
  const controller = useWarehousePrimarySection({
    page,
    warehouse,
  })
  const sectionsSection = useWarehouseSectionsSection({
    record: controller.record,
    publishRecord: controller.publishRecord,
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
        {
          key: "sections",
          type: "item",
          order: 10,
          dirtyLabel: "sections",
          controller: sectionsSection,
          render: () => (
            <WarehouseSectionsSection
              rows={sectionsSection.rows}
              locations={sectionsSection.locations}
              noticeMessage={sectionsSection.noticeMessage}
              noticeError={sectionsSection.noticeError}
              onNameChange={sectionsSection.setSectionName}
              onRemoveRow={sectionsSection.removeSection}
              onAddLocation={sectionsSection.addLocation}
              onLocationCodeChange={sectionsSection.setLocationCode}
              onRemoveLocation={sectionsSection.removeLocation}
              subHeader={{
                isDirty: sectionsSection.isDirty,
                isSaving: sectionsSection.isSaving,
                hasConflict: sectionsSection.hasConflict,
                error: sectionsSection.error,
                onSave: () => void sectionsSection.save(),
                onDiscard: () => sectionsSection.discard(),
                saveLabel: "Save Sections",
                savingLabel: "Saving Sections...",
                actions: [
                  {
                    key: "add-section",
                    kind: "add-row",
                    label: "Add Section",
                    onClick: sectionsSection.addSection,
                    disabled: sectionsSection.isSaving,
                  },
                ],
              }}
            />
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
