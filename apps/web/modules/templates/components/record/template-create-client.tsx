"use client"

import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createTemplateRequest } from "@/modules/templates/data/mutations"
import { EMPTY_TEMPLATE_FORM, type TemplateForm } from "@builders/domain"
import {
  TemplatePrimaryFieldsSection,
  type TemplateDropdownOption,
  type TemplatePropertyOption,
} from "./template-primary-fields-section"

function createInitialTemplateForm(defaults: Partial<TemplateForm>): TemplateForm {
  return { ...EMPTY_TEMPLATE_FORM, ...defaults }
}

function TemplateCreatePanel({
  page,
  backHref,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  initialPropertyId,
  initialManagementCompanyId,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplatePropertyOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  initialPropertyId: string
  initialManagementCompanyId: string
}) {
  const controller = useSingleSectionCreateController<TemplateForm>({
    page,
    createInitialValue: () =>
      createInitialTemplateForm({
        propertyId: initialPropertyId,
        managementCompanyId: initialManagementCompanyId,
      }),
    createRecord: async (localValue) => {
      const payload = await createTemplateRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/templates", payload.template.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Template Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Template"
        savingLabel="Creating Template..."
      >
        <TemplatePrimaryFieldsSection
          draft={controller.primarySection.localValue}
          managementOptions={managementOptions}
          propertyOptions={propertyOptions}
          jobTypeOptions={jobTypeOptions}
          warehouseOptions={warehouseOptions}
          propertyLocked={Boolean(initialPropertyId)}
          managementCompanyLocked={Boolean(initialManagementCompanyId)}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function TemplateCreateClient({
  backHref,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  initialPropertyId,
  initialManagementCompanyId,
}: {
  backHref: string
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplatePropertyOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  initialPropertyId: string
  initialManagementCompanyId: string
}) {
  return (
    <RecordCreateClientScaffold
      title="New Template"
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this form without saving?"
    >
      {(page) => (
        <TemplateCreatePanel
          page={page}
          backHref={backHref}
          managementOptions={managementOptions}
          propertyOptions={propertyOptions}
          jobTypeOptions={jobTypeOptions}
          warehouseOptions={warehouseOptions}
          initialPropertyId={initialPropertyId}
          initialManagementCompanyId={initialManagementCompanyId}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
