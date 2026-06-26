"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { buildTemplateHubHref } from "@/hooks/navigation"
import { createTemplateRequest } from "@/modules/templates/data/mutations"
import { EMPTY_TEMPLATE_FORM, type TemplateForm } from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./primary/template-primary-fields-section"
import { TemplateRecordFooter } from "./footer"

function TemplateCreatePanel({
  page,
  backHref,
  initialPropertyId,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  initialPropertyId?: string
}) {
  const controller = useSingleSectionCreateController<TemplateForm>({
    page,
    createInitialValue: () => ({
      ...EMPTY_TEMPLATE_FORM,
      propertyId: initialPropertyId ?? EMPTY_TEMPLATE_FORM.propertyId,
    }),
    createRecord: async (localValue) => {
      const payload = await createTemplateRequest(localValue)

      return {
        redirectTo: buildTemplateHubHref({ templateId: payload.template.id, returnTo: backHref }),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Template Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create"
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
          onFieldsChange={(patch) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              ...patch,
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
}: {
  backHref: string
  initialPropertyId?: string
}) {
  return (
    <RecordCreateClientScaffold
      title="New Template"
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this form without saving?"
    >
      {(page) => (
        <TemplateCreatePanel page={page} backHref={backHref} initialPropertyId={initialPropertyId} />
      )}
    </RecordCreateClientScaffold>
  )
}
