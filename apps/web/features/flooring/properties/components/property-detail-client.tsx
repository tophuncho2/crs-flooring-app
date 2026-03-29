"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/features/dashboard/shared/record-view/client/record-detail-client-scaffold"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"
import { PropertyRecordPanel } from "./record/property-record-panel"
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
  return (
    <RecordDetailClientScaffold
      title={initialProperty.name}
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave this property without saving?"
    >
      {(page) => (
        <PropertyDetailContent
          page={page}
          initialProperty={initialProperty}
          managementOptions={managementOptions}
          warehouseOptions={warehouseOptions}
          padProductOptions={padProductOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}

function PropertyDetailContent({
  page,
  initialProperty,
  managementOptions,
  warehouseOptions,
  padProductOptions,
}: {
  page: RecordDetailClientScaffoldContext
  initialProperty: PropertyDetailRecord
  managementOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
}) {
  const router = useRouter()
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
  )
}
