"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import { usePropertyPrimarySection } from "./controllers/use-property-primary-section"
import { PropertyPrimaryFieldsSection } from "./sections/property-primary-fields-section"
import { PropertyTemplatesSection } from "./sections/property-templates-section"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "../../domain/types"

export function PropertyRecordPanel({
  page,
  property,
  managementOptions,
  warehouseOptions,
}: {
  page: RecordDetailClientScaffoldContext
  property: PropertyDetailRecord
  managementOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
}) {
  const controller = usePropertyPrimarySection({
    page,
    property,
  })
  const templateNavigation = useRecordEntryNavigation("/dashboard/flooring/templates")
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  const handleOpenTemplate = useCallback(
    (templateId: string) => {
      page.confirmNavigation(() => {
        setLoadingTemplateId(templateId)
        templateNavigation.openRecord(templateId)
      })
    },
    [page, templateNavigation],
  )

  useEffect(() => {
    page.setDirtySections(controller.primarySection.isDirty ? ["primary"] : [])
  }, [controller.primarySection.isDirty, page])

  return (
    <div className="space-y-4">
      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
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
              managementOptions={managementOptions}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                controller.primarySection.setLocalValue((previous: PropertyPrimaryForm) => ({
                  ...previous,
                  [field]: field === "state" ? normalizeAddressState(value) : value,
                }))
              }}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <PropertyTemplatesSection
          actionPanel={
            <RecordSectionSubHeader
              isDirty={false}
              isSaving={false}
              hasConflict={false}
              canManage={false}
              actions={[
                {
                  key: "add-template",
                  label: "Add Template",
                  tone: "primary",
                  onClick: () => {
                    page.confirmNavigation(() => {
                      templateNavigation.openCreate({
                        propertyId: controller.record.id,
                      })
                    })
                  },
                },
              ]}
            />
          }
          templates={controller.record.templates}
          loadingTemplateId={loadingTemplateId}
          onOpenTemplate={handleOpenTemplate}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Property"
        deleteConfirmMessage={buildDeleteConfirmationMessage("property")}
        onDelete={() => void controller.deleteRecord()}
        onClose={page.closePage}
      />
    </div>
  )
}
