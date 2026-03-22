"use client"

import { useCallback } from "react"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-page/record-detail-page-shell"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import type { EditableMaterialItem, MaterialItemOption } from "@/features/flooring/shared/record-items/material-items-editor"
import type { EditableServiceItem, ServiceOption, UnitOption } from "@/features/flooring/shared/record-items/service-items-editor"
import { TemplateRecordPanel, type TemplatePanelRow } from "./template-record-panel"

export function TemplateDetailClient({
  template,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
  backHref,
}: {
  template: TemplatePanelRow
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved template changes. Leave this template without saving?",
  })

  const closePage = useCallback(() => {
    page.closePage()
  }, [page])

  return (
    <RecordDetailPageShell
      title={`Template ${template.templateNumber}`}
      backHref={backHref}
      onBack={closePage}
      headerMeta={<RecordLineSummary materialItems={page.summary.materialItems} serviceItems={page.summary.serviceItems} variant="header" />}
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
    >
      <TemplateRecordPanel
        templateId={template.id}
        initialTemplate={template}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        padProductOptions={padProductOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
        unitOptions={unitOptions}
        onClose={closePage}
        onSummaryChange={page.setSummary as (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void}
        onDirtyChange={page.setIsDirty}
        onTemplateDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
