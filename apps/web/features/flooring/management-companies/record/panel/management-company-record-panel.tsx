"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionSubHeader,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import { useManagementCompanyPrimarySection } from "./controllers/use-management-company-primary-section"
import { useManagementCompanyPropertiesSection } from "./controllers/use-management-company-properties-section"
import { ManagementCompanyPrimaryFieldsSection } from "./sections/management-company-primary-fields-section"
import { ManagementCompanyPropertiesSection } from "./sections/management-company-properties-section"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "../../domain/types"

export function ManagementCompanyRecordPanel({
  page,
  company,
}: {
  page: RecordDetailClientScaffoldContext
  company: ManagementCompanyDetail
}) {
  const router = useRouter()
  const controller = useManagementCompanyPrimarySection({
    page,
    company,
  })
  const propertiesSection = useManagementCompanyPropertiesSection({
    record: controller.record,
    publishRecord: controller.publishRecord,
  })
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<string[]>([])
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  const buildReturnToPath = useCallback(() => {
    return buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
  }, [])

  const navigateToDetail = useCallback(
    (basePath: string, id: string, setLoadingId: (value: string | null) => void) => {
      page.confirmNavigation(() => {
        setLoadingId(id)
        router.push(buildCanonicalDetailHref(basePath, id, buildReturnToPath()), { scroll: false })
      })
    },
    [buildReturnToPath, page, router],
  )

  const handleOpenProperty = useCallback(
    (propertyId: string) => {
      navigateToDetail("/dashboard/flooring/properties", propertyId, setLoadingPropertyId)
    },
    [navigateToDetail],
  )

  const handleOpenTemplate = useCallback(
    (templateId: string) => {
      navigateToDetail("/dashboard/flooring/templates", templateId, setLoadingTemplateId)
    },
    [navigateToDetail],
  )

  useEffect(() => {
    const dirtySections: string[] = []

    if (controller.primarySection.isDirty) {
      dirtySections.push("primary")
    }

    if (propertiesSection.isDirty) {
      dirtySections.push("properties")
    }

    page.setDirtySections(dirtySections)
  }, [controller.primarySection.isDirty, page, propertiesSection.isDirty])

  return (
    <div className="space-y-4">
      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
          <RecordPrimarySectionInstance
            title="Management Company Details"
            error={controller.primarySection.error}
            noticeMessage={controller.primarySection.noticeMessage}
            noticeError={controller.primarySection.noticeError}
            isDirty={controller.primarySection.isDirty}
            isSaving={controller.primarySection.isSaving}
            hasConflict={controller.primarySection.hasConflict}
            onSave={() => void controller.primarySection.save()}
            onDiscard={controller.primarySection.discard}
            saveLabel="Save Company"
            savingLabel="Saving Company..."
            showHeader={false}
          >
            <ManagementCompanyPrimaryFieldsSection
              company={controller.record}
              draft={controller.primarySection.localValue}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                controller.primarySection.setLocalValue((previous: ManagementCompanyForm) => ({
                  ...previous,
                  [field]: field === "state" ? normalizeAddressState(value) : value,
                }))
              }}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <ManagementCompanyPropertiesSection
          actionPanel={
            <RecordSectionSubHeader
              isDirty={propertiesSection.isDirty}
              isSaving={propertiesSection.isSaving}
              hasConflict={propertiesSection.hasConflict}
              error={propertiesSection.error}
              onSave={() => void propertiesSection.save()}
              onDiscard={propertiesSection.discard}
              saveLabel="Save Property"
              savingLabel="Saving Property..."
              actions={[
                {
                  key: "add-property",
                  label: "Add Property",
                  onClick: propertiesSection.addDraft,
                  disabled: !propertiesSection.canAddDraft,
                },
              ]}
            />
          }
          properties={controller.record.properties}
          draft={propertiesSection.localValue}
          expandedPropertyIds={expandedPropertyIds}
          loadingPropertyId={loadingPropertyId}
          loadingTemplateId={loadingTemplateId}
          noticeMessage={propertiesSection.noticeMessage}
          noticeError={propertiesSection.noticeError}
          onTogglePropertyTemplates={(propertyId) => {
            setExpandedPropertyIds((previous) =>
              previous.includes(propertyId)
                ? previous.filter((id) => id !== propertyId)
                : [...previous, propertyId],
            )
          }}
          onDraftChange={propertiesSection.setDraftField}
          onOpenProperty={handleOpenProperty}
          onOpenTemplate={handleOpenTemplate}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Company"
        deleteConfirmMessage={buildDeleteConfirmationMessage("management company")}
        onDelete={() => void controller.deleteRecord()}
        onClose={page.closePage}
      />
    </div>
  )
}
