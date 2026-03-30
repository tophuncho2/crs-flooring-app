"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  buildSingleSectionDeleteConfirmationMessage,
  confirmRecordAction,
  RecordFormNotices,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
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

  const deleteConfirmationMessage = useMemo(
    () =>
      buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "management company",
        description: "Linked properties remain separate records and can still be opened from this section.",
      }),
    [],
  )

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

  const handleDelete = useCallback(async () => {
    if (!controller.deleteRecord) {
      return
    }

    if (!confirmRecordAction(deleteConfirmationMessage)) {
      return
    }

    await controller.deleteRecord()
  }, [controller, deleteConfirmationMessage])

  return (
    <div className="space-y-4">
      <RecordFormNotices message={page.notices.message} error={page.notices.error} />

      <RecordSectionStack>
        <RecordPrimarySectionInstance
          title="Management Company Details"
          error={controller.primarySection.error}
          isDirty={controller.primarySection.isDirty}
          isSaving={controller.primarySection.isSaving}
          hasConflict={controller.primarySection.hasConflict}
          onSave={() => void controller.primarySection.save()}
          onDiscard={controller.primarySection.discard}
          onDelete={handleDelete}
          saveLabel="Save Company"
          savingLabel="Saving Company..."
          deleteLabel="Delete Company"
        >
          <ManagementCompanyPrimaryFieldsSection
            company={controller.record}
            draft={controller.primarySection.localValue}
            disabled={controller.primarySection.isSaving}
            onFieldChange={(field, value) => {
              page.notices.clearNotices()
              controller.primarySection.setLocalValue((previous: ManagementCompanyForm) => ({
                ...previous,
                [field]: field === "state" ? normalizeAddressState(value) : value,
              }))
            }}
          />
        </RecordPrimarySectionInstance>

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
    </div>
  )
}
