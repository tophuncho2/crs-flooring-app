"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import { useManagementCompanyPrimarySection } from "./controllers/use-management-company-primary-section"
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
  const controller = useManagementCompanyPrimarySection({
    page,
    company,
  })
  const propertyNavigation = useRecordEntryNavigation("/dashboard/flooring/properties")
  const templateNavigation = useRecordEntryNavigation("/dashboard/flooring/templates")
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<string[]>([])
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  const navigateToDetail = useCallback(
    (id: string, setLoadingId: (value: string | null) => void, openRecord: (recordId: string) => void) => {
      page.confirmNavigation(() => {
        setLoadingId(id)
        openRecord(id)
      })
    },
    [page],
  )

  const handleOpenProperty = useCallback(
    (propertyId: string) => {
      navigateToDetail(propertyId, setLoadingPropertyId, propertyNavigation.openRecord)
    },
    [navigateToDetail, propertyNavigation.openRecord],
  )

  const handleOpenTemplate = useCallback(
    (templateId: string) => {
      navigateToDetail(templateId, setLoadingTemplateId, templateNavigation.openRecord)
    },
    [navigateToDetail, templateNavigation.openRecord],
  )

  useEffect(() => {
    page.setDirtySections(controller.primarySection.isDirty ? ["primary"] : [])
  }, [controller.primarySection.isDirty, page])

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
          subHeader={{
            isDirty: false,
            isSaving: false,
            hasConflict: false,
            canManage: false,
            showStatus: false,
            actions: [
              {
                key: "add-property",
                kind: "route-add",
                label: "Add Property",
                tone: "primary",
                onClick: () => {
                  page.confirmNavigation(() => {
                    propertyNavigation.openCreate({
                      managementCompanyId: controller.record.id,
                    })
                  })
                },
              },
            ],
          }}
          properties={controller.record.properties}
          expandedPropertyIds={expandedPropertyIds}
          loadingPropertyId={loadingPropertyId}
          loadingTemplateId={loadingTemplateId}
          onTogglePropertyTemplates={(propertyId) => {
            setExpandedPropertyIds((previous) =>
              previous.includes(propertyId)
                ? previous.filter((id) => id !== propertyId)
                : [...previous, propertyId],
            )
          }}
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
