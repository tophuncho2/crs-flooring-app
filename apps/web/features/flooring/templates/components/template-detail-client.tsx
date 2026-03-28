"use client"

import { RecordLineSummary } from "@/features/flooring/shared/ui/display/record-line-summary"
import { RecordDetailClientScaffold } from "@/features/dashboard/shared/record-view/client/record-detail-client-scaffold"
import type { EditableMaterialItem, MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { EditableServiceItem, ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import { TemplateRecordPanel } from "./record/template-record-panel"
import type { SalesRepContactOption, TemplateDetail } from "@/features/flooring/templates/types"

export function TemplateDetailClient({
  template,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  backHref,
}: {
  template: TemplateDetail
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Template ${template.templateNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this template without saving?"
      headerMeta={({ summary }) => (
        <RecordLineSummary materialItems={summary.materialItems} serviceItems={summary.serviceItems} variant="header" />
      )}
    >
      {(page) => {
        return (
          <TemplateRecordPanel
            templateId={template.id}
            initialTemplate={template}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            padProductOptions={padProductOptions}
            productOptions={productOptions}
            serviceOptions={serviceOptions}
            salesRepOptions={salesRepOptions}
            unitOptions={unitOptions}
            onClose={page.closePage}
            onSummaryChange={page.setSummary as (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void}
            onDirtyChange={page.setIsDirty}
            onTemplateDeleted={() => {
              page.redirectToBack()
            }}
          />
        )
      }}
    </RecordDetailClientScaffold>
  )
}
