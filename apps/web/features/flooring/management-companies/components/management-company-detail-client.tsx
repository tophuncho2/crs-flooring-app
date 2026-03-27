"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/flooring/shared/controllers/record-page/detail-routes"
import { ManagementCompanyRecordPanel } from "./management-company-record-panel"
import {
  useManagementCompanyRecordController,
  type ManagementCompanyDetailRecord,
} from "../controllers/use-management-company-record-controller"

export function ManagementCompanyDetailClient({
  company: initialCompany,
  backHref,
}: {
  company: ManagementCompanyDetailRecord
  backHref: string
}) {
  const router = useRouter()
  const { closePage, confirmNavigation, notices, redirectToBack, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved management company changes. Leave this company without saving?",
  })
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const controller = useManagementCompanyRecordController({
    initialCompany,
    notices,
    onDeleted: redirectToBack,
  })

  useEffect(() => {
    setIsDirty(controller.isDirty)
  }, [controller.isDirty, setIsDirty])

  function navigateToProperty(propertyId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    setLoadingPropertyId(propertyId)
    confirmNavigation(() => {
      router.push(buildCanonicalDetailHref("/dashboard/flooring/properties", propertyId, currentPath), { scroll: false })
    })
  }

  async function createPropertyAndOpen() {
    const propertyId = await controller.createProperty()
    if (propertyId) {
      navigateToProperty(propertyId)
    }
  }

  return (
    <RecordDetailPageShell
      title={controller.company.name}
      backHref={backHref}
      onBack={closePage}
    >
      <ManagementCompanyRecordPanel
        company={controller.company}
        draft={controller.draft}
        notices={notices}
        loading={controller.loading}
        loadError={controller.error}
        isPropertyCreateOpen={controller.isPropertyCreateOpen}
        propertyDraft={controller.propertyDraft}
        loadingPropertyId={loadingPropertyId}
        isSaving={controller.isSaving}
        onDraftChange={controller.setDraftField}
        onSave={() => void controller.saveCompany()}
        onDelete={() => void controller.deleteCompany()}
        onClose={closePage}
        onPropertyDraftChange={controller.setPropertyDraftField}
        onOpenProperty={navigateToProperty}
        onOpenCreateProperty={controller.toggleCreateProperty}
        onCancelCreateProperty={controller.cancelCreateProperty}
        onCreateProperty={() => void createPropertyAndOpen()}
        isCreatingProperty={controller.isCreatingProperty}
      />
    </RecordDetailPageShell>
  )
}
