"use client"

import { RecordMultiSectionPanel } from "@/components/panels/record-multi-section-panel"
import { RecordPrimarySectionInstance } from "@/components/sections/panels/record-primary-section-instance"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { normalizeAddressState } from "@builders/domain"
import type { useManagementCompanyPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-management-company-primary-section"
import { ManagementCompanyPrimaryFieldsSection } from "./management-company-primary-fields-section"
import type { ManagementCompanyForm } from "@builders/domain"

export function ManagementCompanyPrimarySectionPanel({
  page,
  controller,
}: {
  page: RecordDetailClientScaffoldContext
  controller: ReturnType<typeof useManagementCompanyPrimarySection>
}) {
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
    />
  )
}
