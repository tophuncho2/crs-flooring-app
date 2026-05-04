"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { TemplateRecordPanel } from "./template-record-panel"
import type { ProductPickerOption, TemplateDetail } from "@builders/domain"
import type {
  TemplateDropdownOption,
  TemplatePropertyOption,
} from "./template-primary-fields-section"

export function TemplateDetailClient({
  template,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  initialProductPickerOptionsByItemId,
  backHref,
}: {
  template: TemplateDetail
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplatePropertyOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  initialProductPickerOptionsByItemId: Record<string, ProductPickerOption>
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Template ${template.templateNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this template without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <TemplateRecordPanel
          page={page}
          template={template}
          managementOptions={managementOptions}
          propertyOptions={propertyOptions}
          jobTypeOptions={jobTypeOptions}
          warehouseOptions={warehouseOptions}
          initialProductPickerOptionsByItemId={initialProductPickerOptionsByItemId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
