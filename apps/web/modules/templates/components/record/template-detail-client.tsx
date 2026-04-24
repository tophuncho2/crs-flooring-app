"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { TemplateRecordPanel } from "./template-record-panel"
import type { TemplateDetail } from "@builders/domain"
import type { TemplateDropdownOption } from "./template-primary-fields-section"
import type { MaterialItemProductOption } from "./template-material-items-section"

export function TemplateDetailClient({
  template,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  productOptions,
  backHref,
}: {
  template: TemplateDetail
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplateDropdownOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  productOptions: MaterialItemProductOption[]
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
          productOptions={productOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
