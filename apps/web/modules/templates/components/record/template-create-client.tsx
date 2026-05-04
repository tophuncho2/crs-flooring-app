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
} from "./template-primary-fields-section"

function TemplateCreatePanel({
  page,
  backHref,
  jobTypeOptions,
  warehouseOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
}) {
  const controller = useSingleSectionCreateController<TemplateForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_TEMPLATE_FORM }),
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
          detail={null}
          jobTypeOptions={jobTypeOptions}
          warehouseOptions={warehouseOptions}
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
  jobTypeOptions,
  warehouseOptions,
}: {
  backHref: string
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
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
          jobTypeOptions={jobTypeOptions}
          warehouseOptions={warehouseOptions}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
