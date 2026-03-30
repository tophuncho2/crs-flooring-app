"use client"

import { RecordLineSummary } from "@/features/flooring/shared/ui/display/record-line-summary"
import { RecordDetailClientScaffold } from "@/features/shared/engines/record-view"
import type { EditableMaterialItem, MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { EditableServiceItem, ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import { TemplateRecordPanel } from "../panel/template-record-panel"
import type { SalesRepContactOption, TemplateDetail } from "@/features/flooring/templates/types"

export function TemplateDetailClient({
  currentUserId,
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
  currentUserId: string
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
      headerVariant="section"
      headerMeta={({ summary }) => (
        <RecordLineSummary materialItems={summary.materialItems} serviceItems={summary.serviceItems} variant="header" />
      )}
    >
      {(page) => {
        return (
          <TemplateRecordPanel
            currentUserId={currentUserId}
            templateId={template.id}
            initialTemplate={template}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            padProductOptions={padProductOptions}
            productOptions={productOptions}
            serviceOptions={serviceOptions}
            salesRepOptions={salesRepOptions}
            unitOptions={unitOptions}
            showPrimaryFields={page.isPrimarySectionOpen}
            usePageHeaderForPrimarySection
            onClose={page.closePage}
            notices={page.notices}
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
