"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { TemplateRecordPanel } from "./template-record-panel"
import type { TemplateDetail } from "@builders/domain"
import type { TemplateDropdownOption } from "./template-primary-fields-section"

export function TemplateDetailClient({
  template,
  warehouseOptions,
  backHref,
}: {
  template: TemplateDetail
  warehouseOptions: TemplateDropdownOption[]
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
          warehouseOptions={warehouseOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
