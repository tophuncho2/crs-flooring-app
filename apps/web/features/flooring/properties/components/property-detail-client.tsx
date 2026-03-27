"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/record-detail-page-shell"
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
  const { closePage, confirmNavigation, notices, redirectToBack, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved property changes. Leave this property without saving?",
  })
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)
  const controller = usePropertyRecordController({
    initialProperty,
    notices,
    onDeleted: redirectToBack,
  })

  useEffect(() => {
    setIsDirty(controller.isDirty)
  }, [controller.isDirty, setIsDirty])

  function navigateToTemplate(templateId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    setLoadingTemplateId(templateId)
    confirmNavigation(() => {
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
      onBack={closePage}
    >
      <PropertyRecordPanel
        property={controller.property}
        draft={controller.draft}
        managementOptions={managementOptions}
        notices={notices}
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
        onClose={closePage}
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
