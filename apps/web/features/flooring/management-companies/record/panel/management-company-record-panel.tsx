"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"
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
  const router = useRouter()
  const controller = useManagementCompanyPrimarySection({
    page,
    company,
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
