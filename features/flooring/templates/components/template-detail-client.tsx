"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-detail-page-shell"
import type { EditableMaterialItem, MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import type { EditableServiceItem, ServiceOption, UnitOption } from "@/features/flooring/shared/service-items-editor"
import { useUnsavedChangesGuard } from "@/features/flooring/shared/use-unsaved-changes-guard"
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
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)
  const [summary, setSummary] = useState<{
    materialItems: EditableMaterialItem[]
    serviceItems: EditableServiceItem[]
  }>({
    materialItems: [],
    serviceItems: [],
  })
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved template changes. Leave this template without saving?",
  })

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  return (
    <RecordDetailPageShell
      title={`Template ${template.templateNumber}`}
      backHref={backHref}
      onBack={closePage}
      headerMeta={<RecordLineSummary materialItems={summary.materialItems} serviceItems={summary.serviceItems} variant="header" />}
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
        onSummaryChange={setSummary}
        onDirtyChange={setIsDirty}
        onTemplateDeleted={() => {
          setIsDirty(false)
          router.push(backHref, { scroll: false })
        }}
      />
    </RecordDetailPageShell>
  )
}
