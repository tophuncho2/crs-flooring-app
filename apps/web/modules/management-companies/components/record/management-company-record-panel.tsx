"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { normalizeAddressState } from "@builders/domain"
import { useManagementCompanyPrimarySection } from "@/modules/management-companies/controllers/use-management-company-primary-section"
import { ManagementCompanyPrimaryFieldsSection } from "./management-company-primary-fields-section"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "@builders/domain"

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
      ]}
      footer={{
        deleteLabel: "Delete Company",
        deleteConfirmMessage: buildDeleteConfirmationMessage("management company"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
