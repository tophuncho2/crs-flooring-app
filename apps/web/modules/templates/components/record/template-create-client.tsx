"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createTemplateRequest } from "@/modules/templates/data/mutations"
import { EMPTY_TEMPLATE_FORM, type TemplateForm } from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./template-primary-fields-section"
import { TemplateRecordFooter } from "./footer"

function TemplateCreatePanel({
  page,
  backHref,
  initialPropertyId,
  initialManagementCompanyId,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  initialPropertyId?: string
  initialManagementCompanyId?: string
}) {
  const controller = useSingleSectionCreateController<TemplateForm>({
    page,
    createInitialValue: () => ({
      ...EMPTY_TEMPLATE_FORM,
      propertyId: initialPropertyId ?? EMPTY_TEMPLATE_FORM.propertyId,
      managementCompanyId: initialManagementCompanyId ?? EMPTY_TEMPLATE_FORM.managementCompanyId,
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
          detail={null}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <TemplateRecordFooter onClose={page.closePage} />
    </div>
  )
}

export function TemplateCreateClient({
  backHref,
  initialPropertyId,
  initialManagementCompanyId,
}: {
  backHref: string
  initialPropertyId?: string
  initialManagementCompanyId?: string
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
          initialPropertyId={initialPropertyId}
          initialManagementCompanyId={initialManagementCompanyId}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
