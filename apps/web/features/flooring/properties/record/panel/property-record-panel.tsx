"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import { usePropertyPrimarySection } from "./controllers/use-property-primary-section"
import { usePropertyTemplatesSection } from "./controllers/use-property-templates-section"
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
  const router = useRouter()
  const controller = usePropertyPrimarySection({
    page,
    property,
  })
  const templatesSection = usePropertyTemplatesSection({
    record: controller.record,
    publishRecord: controller.publishRecord,
  })
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  const buildReturnToPath = useCallback(() => {
    return buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
  }, [])

  const handleOpenTemplate = useCallback(
    (templateId: string) => {
      page.confirmNavigation(() => {
        setLoadingTemplateId(templateId)
        router.push(buildCanonicalDetailHref("/dashboard/flooring/templates", templateId, buildReturnToPath()), {
          scroll: false,
        })
      })
    },
    [buildReturnToPath, page, router],
  )

  useEffect(() => {
    const dirtySections: string[] = []

    if (controller.primarySection.isDirty) {
      dirtySections.push("primary")
    }

    if (templatesSection.isDirty) {
      dirtySections.push("templates")
    }

    page.setDirtySections(dirtySections)
  }, [controller.primarySection.isDirty, page, templatesSection.isDirty])

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
              isDirty={templatesSection.isDirty}
              isSaving={templatesSection.isSaving}
              hasConflict={templatesSection.hasConflict}
              error={templatesSection.error}
              onSave={() => void templatesSection.save()}
              onDiscard={templatesSection.discard}
              saveLabel="Save Template"
              savingLabel="Saving Template..."
              actions={[
                {
                  key: "add-template",
                  label: "Add Template",
                  onClick: templatesSection.addDraft,
                  disabled: !templatesSection.canAddDraft,
                },
              ]}
            />
          }
          templates={controller.record.templates}
          draft={templatesSection.localValue}
          warehouseOptions={warehouseOptions}
          loadingTemplateId={loadingTemplateId}
          noticeMessage={templatesSection.noticeMessage}
          noticeError={templatesSection.noticeError}
          onDraftChange={templatesSection.setDraftField}
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
