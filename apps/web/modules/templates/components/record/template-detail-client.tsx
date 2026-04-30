"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { TemplateRecordPanel } from "./template-record-panel"
import type { TemplateDetail } from "@builders/domain"
import type {
  TemplateDropdownOption,
  TemplatePropertyOption,
} from "./template-primary-fields-section"
import type {
  MaterialItemProductOption,
  TemplateMaterialItemCategoryOption,
} from "./template-material-items-section"

export function TemplateDetailClient({
  template,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  productOptions,
  categoryOptions,
  backHref,
}: {
  template: TemplateDetail
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplatePropertyOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  productOptions: MaterialItemProductOption[]
  categoryOptions: TemplateMaterialItemCategoryOption[]
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
          categoryOptions={categoryOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
