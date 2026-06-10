"use client"

import {
  RecordMultiSectionPanel,
  RecordDetailClientScaffold,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { useMcCreateSection } from "@/modules/management-companies/controllers/record/primary/use-mc-create-section"
import { ManagementCompanyCellsSection } from "./primary/management-company-cells-section"

/**
 * The Management Company **create** view, reached when a property without an MC
 * is linked from the standalone property record view
 * (`/dashboard/management-companies/new?property=<id>`). §1 = MC cells (a blank,
 * creatable primary). Saving creates the MC and links the in-tow property
 * atomically (the property rides in `propertyId`), then redirects to the linked
 * property's record view.
 */
function ManagementCompanyCreatePanel({
  page,
  propertyId,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  propertyId: string
  backHref: string
}) {
  const controller = useMcCreateSection({ page, propertyId, backHref })
  const primary = controller.primarySection

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "management company",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Management Company"
          showHeader={false}
          saveLabel="Create Management Company"
          savingLabel="Creating Management Company..."
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <ManagementCompanyCellsSection
            form={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return <RecordMultiSectionPanel page={page} sections={sections} />
}

export function ManagementCompanyCreateClient({
  propertyId,
  backHref,
}: {
  propertyId: string
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="New Management Company"
      backHref={backHref}
      dirtyMessage="You have unsaved management-company changes. Leave without saving?"
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Management" }}
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyCreatePanel page={page} propertyId={propertyId} backHref={backHref} />
      )}
    </RecordDetailClientScaffold>
  )
}
