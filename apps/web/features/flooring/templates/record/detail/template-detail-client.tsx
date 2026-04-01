"use client"

import { RecordDetailClientScaffold } from "@/features/shared/engines/record-view"
import type { MaterialItemOption } from "@/features/flooring/shared/ui/record-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/ui/record-items/service-items-editor"
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
    >
      {(page) => {
        return (
          <TemplateRecordPanel
            page={page}
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
            onTemplateDeleted={() => {
              page.redirectToBack()
            }}
          />
        )
      }}
    </RecordDetailClientScaffold>
  )
}
