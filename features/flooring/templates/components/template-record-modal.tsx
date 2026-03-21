"use client"

import { useState } from "react"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordModalShell } from "@/features/flooring/shared/record-form"
import type { EditableMaterialItem, MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import type { EditableServiceItem, ServiceOption, UnitOption } from "@/features/flooring/shared/service-items-editor"
import { TemplateRecordPanel, type TemplatePanelRow } from "./template-record-panel"

export function TemplateRecordModal({
  template,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
  onClose,
  onTemplateSaved,
  onTemplateDeleted,
  zIndex,
  onDirtyChange,
}: {
  template: TemplatePanelRow
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  onTemplateSaved?: (template: TemplatePanelRow, previousPropertyId: string, itemsCount: number) => void
  onTemplateDeleted?: (templateId: string, propertyId: string) => void
  zIndex?: number
  onDirtyChange?: (value: boolean) => void
}) {
  const [summary, setSummary] = useState<{
    materialItems: EditableMaterialItem[]
    serviceItems: EditableServiceItem[]
  }>({
    materialItems: [],
    serviceItems: [],
  })

  return (
    <RecordModalShell
      title={`Template ${template.templateNumber}`}
      onClose={onClose}
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
      headerMeta={<RecordLineSummary materialItems={summary.materialItems} serviceItems={summary.serviceItems} variant="header" />}
      zIndex={zIndex}
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
        onClose={onClose}
        onSummaryChange={setSummary}
        onTemplateSaved={onTemplateSaved}
        onTemplateDeleted={onTemplateDeleted}
        onDirtyChange={onDirtyChange}
      />
    </RecordModalShell>
  )
}
