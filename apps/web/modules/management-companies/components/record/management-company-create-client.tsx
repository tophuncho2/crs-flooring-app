"use client"

import {
  RecordDetailClientScaffold,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { PropertyRecordView } from "./properties/property-record-view"
import { useMcCreateSection } from "@/modules/management-companies/controllers/record/primary/use-mc-create-section"
import { ManagementCompanyCellsSection } from "./primary/management-company-cells-section"

/**
 * The Management Company **create** view, reached when a property without an MC
 * is opened (`/dashboard/management-companies/new?property=<id>`). Same shape as
 * the edit view: §1 = MC cells (a blank, creatable primary), §2 = the property
 * being linked (embedded, editable). Saving §1 creates the MC + links the
 * property atomically, then redirects to the MC edit view drilled into it.
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
    {
      key: "property",
      type: "item",
      order: 10,
      render: () => (
        <PropertyRecordView
          propertyId={propertyId}
          hostPage={page}
          onBack={page.closePage}
        />
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
