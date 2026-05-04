"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { normalizeAddressState } from "@builders/domain"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/use-property-primary-section"
import { PropertyPrimaryFieldsSection } from "./property-primary-fields-section"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "@builders/domain"

export function PropertyRecordPanel({
  page,
  property,
}: {
  page: RecordDetailClientScaffoldContext
  property: PropertyDetailRecord
}) {
  const controller = usePropertyPrimarySection({
    page,
    property,
  })

  return (
    <RecordMultiSectionPanel
      page={page}
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
              title="Property Details"
              error={controller.primarySection.error}
              noticeMessage={controller.primarySection.noticeMessage}
              noticeError={controller.primarySection.noticeError}
              isDirty={controller.primarySection.isDirty}
              isSaving={controller.primarySection.isSaving}
              hasConflict={controller.primarySection.hasConflict}
              onSave={() => void controller.primarySection.save()}
              onDiscard={controller.primarySection.discard}
              saveLabel="Save Property"
              savingLabel="Saving Property..."
              showHeader={false}
            >
              <PropertyPrimaryFieldsSection
                property={controller.record}
                draft={controller.primarySection.localValue}
                disabled={controller.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous: PropertyPrimaryForm) => ({
                    ...previous,
                    [field]: field === "state" ? normalizeAddressState(value) : value,
                  }))
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Property",
        deleteConfirmMessage: buildDeleteConfirmationMessage("property"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
