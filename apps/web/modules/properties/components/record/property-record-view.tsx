"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  RecordDeleteDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  toManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
  type ManagementCompanyOption,
  type PropertyDetailRecord,
} from "@builders/domain"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation/routes"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/use-property-primary-section"
import { PropertyFieldsSection } from "./primary/property-fields-section"
import { ManagementCompanyPickerSection } from "./primary/management-company-picker-section"
import { PropertyTemplatesSection } from "./templates/property-templates-section"

/** Hydrate the read-only contact cells from a freshly picked option. */
function toDisplayForm(option: ManagementCompanyOption): ManagementCompanyForm {
  return {
    name: option.name,
    streetAddress: option.streetAddress,
    city: option.city,
    state: option.state,
    zip: option.zip,
    phone: option.phone,
    email: option.email,
  }
}

/**
 * The standalone Property record view. ① the management company — a live MC
 * picker (Company-Name cell) with its Phone/Email/Address shown read-only, above
 * the editable property cells; picking a company is a dirty edit saved with the
 * property, and the record-open primitive on the label hands off to the MC record
 * view — one section · ② the shared templates reference section (always shown),
 * with the property pre-seeded and locked — plus the MC when the property has one
 * — so only a template is choosable.
 *
 * Reached by clicking a property anywhere (the properties list, the MC record
 * view's property list, the WO/template "✎ Property" buttons) — it no longer
 * embeds inside the MC record view.
 */
export function PropertyRecordView({
  page,
  entry,
  managementCompany,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  managementCompany: ManagementCompanyDetail | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const deletion = useRecordDeleteConfirmation(controller.deleteRecord)

  const linkedMc = record.managementCompany

  // The picked MC id lives in the primary draft (dirty-tracked, saved with the
  // property). The contact cells read from local display state, seeded from the
  // server-loaded MC detail and refreshed when a different company is picked.
  const selectedMcId = primary.localValue.managementCompanyId || null
  const [mcDisplay, setMcDisplay] = useState<ManagementCompanyForm | null>(
    managementCompany ? toManagementCompanyForm(managementCompany) : null,
  )
  const [mcLabel, setMcLabel] = useState<string | null>(linkedMc?.name ?? null)

  const selectManagementCompany = (option: ManagementCompanyOption | null) => {
    setMcDisplay(option ? toDisplayForm(option) : null)
    setMcLabel(option?.name ?? null)
  }

  const openManagementCompany = () => {
    if (!selectedMcId) return
    router.push(
      buildRecordDetailHref(
        "/dashboard/management-companies",
        selectedMcId,
        buildCurrentRecordEntryPath(pathname, searchParams),
      ),
    )
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "property",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Property"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          onDelete={deletion.requestDelete}
          deleteLabel="Delete Property"
        >
          <div className="flex flex-col gap-4">
            <ManagementCompanyPickerSection
              value={selectedMcId}
              onChange={(id) =>
                primary.setLocalValue((previous) => ({
                  ...previous,
                  managementCompanyId: id ?? "",
                }))
              }
              onOptionSelected={selectManagementCompany}
              selectedLabel={mcLabel}
              display={mcDisplay}
              editable={!primary.isSaving}
              onOpen={openManagementCompany}
            />
            <PropertyFieldsSection
              draft={primary.localValue}
              editable={!primary.isSaving}
              onFieldChange={(field, value) =>
                primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
              }
            />
          </div>
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  sections.push({
    key: "templates",
    type: "item",
    order: 20,
    render: (ctx) => (
      <PropertyTemplatesSection
        page={ctx.page}
        managementCompany={linkedMc}
        property={record}
      />
    ),
  })

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter onClose={page.closePage} />
      <RecordDeleteDialog
        open={deletion.isOpen}
        isDeleting={deletion.isDeleting}
        title="Delete property?"
        message="This cannot be undone."
        onConfirm={() => void deletion.confirmDelete()}
        onCancel={deletion.cancelDelete}
      />
    </>
  )
}
