"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { normalizeAddressState } from "@builders/domain"
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
  const propertyNavigation = useRecordEntryNavigation("/dashboard/properties")
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")
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
          ),
        },
        {
          key: "properties",
          type: "item",
          order: 10,
          render: () => (
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
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Company",
        deleteConfirmMessage: buildDeleteConfirmationMessage("management company"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
