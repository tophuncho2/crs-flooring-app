"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/ui/record-page/record-panel-width"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/flooring/shared/controllers/record-page/detail-routes"
import { PropertyRecordPanel } from "./property-record-panel"
import { usePropertyRecordController, type PropertyDetailRecord } from "../controllers/use-property-record-controller"

export function PropertyDetailClient({
  property: initialProperty,
  managementOptions,
  warehouseOptions,
  padProductOptions,
  backHref,
}: {
  property: PropertyDetailRecord
  managementOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  backHref: string
}) {
  const router = useRouter()
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved property changes. Leave this property without saving?",
  })
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)
  const controller = usePropertyRecordController({
    initialProperty,
    notices: page.notices,
    onDeleted: page.redirectToBack,
  })

  useEffect(() => {
    page.setIsDirty(controller.isDirty)
  }, [controller.isDirty, page.setIsDirty])

  function navigateToTemplate(templateId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    setLoadingTemplateId(templateId)
    page.confirmNavigation(() => {
      router.push(buildCanonicalDetailHref("/dashboard/flooring/templates", templateId, currentPath), { scroll: false })
    })
  }

  async function createTemplateAndOpen() {
    const templateId = await controller.createTemplate()
    if (templateId) {
      navigateToTemplate(templateId)
    }
  }

  return (
    <RecordDetailPageShell
      title={controller.property.name}
      backHref={backHref}
      onBack={page.closePage}
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
    >
      <PropertyRecordPanel
        property={controller.property}
        draft={controller.draft}
        managementOptions={managementOptions}
        notices={page.notices}
        loading={controller.loading}
        loadError={controller.error}
        isTemplateCreateOpen={controller.isTemplateCreateOpen}
        newTemplateDraft={controller.templateDraft}
        warehouseOptions={warehouseOptions}
        padProductOptions={padProductOptions}
        loadingTemplateId={loadingTemplateId}
        isSaving={controller.isSaving}
        onDraftChange={controller.setDraftField}
        onSave={() => void controller.saveProperty()}
        onDelete={() => void controller.deleteProperty()}
        onClose={page.closePage}
        onTemplateDraftChange={controller.setTemplateDraftField}
        onOpenTemplate={navigateToTemplate}
        onOpenCreateTemplate={controller.toggleCreateTemplate}
        onCancelCreateTemplate={controller.cancelCreateTemplate}
        onCreateTemplate={() => void createTemplateAndOpen()}
        isCreatingTemplate={controller.isCreatingTemplate}
      />
    </RecordDetailPageShell>
  )
}
