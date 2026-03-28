"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/features/dashboard/shared/record-view/client/record-detail-client-scaffold"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/dashboard/shared/navigation/detail-routes"
import { ManagementCompanyRecordPanel } from "./record/management-company-record-panel"
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
  return (
    <RecordDetailClientScaffold
      title={initialCompany.name}
      backHref={backHref}
      dirtyMessage="You have unsaved management company changes. Leave this company without saving?"
    >
      {(page) => <ManagementCompanyDetailContent page={page} initialCompany={initialCompany} />}
    </RecordDetailClientScaffold>
  )
}

function ManagementCompanyDetailContent({
  page,
  initialCompany,
}: {
  page: RecordDetailClientScaffoldContext
  initialCompany: ManagementCompanyDetailRecord
}) {
  const router = useRouter()
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const controller = useManagementCompanyRecordController({
    initialCompany,
    notices: page.notices,
    onDeleted: page.redirectToBack,
  })

  useEffect(() => {
    page.setIsDirty(controller.isDirty)
  }, [controller.isDirty, page])

  function navigateToProperty(propertyId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    setLoadingPropertyId(propertyId)
    page.confirmNavigation(() => {
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
    <ManagementCompanyRecordPanel
      company={controller.company}
      draft={controller.draft}
      notices={page.notices}
      loading={controller.loading}
      loadError={controller.error}
      isPropertyCreateOpen={controller.isPropertyCreateOpen}
      propertyDraft={controller.propertyDraft}
      loadingPropertyId={loadingPropertyId}
      isSaving={controller.isSaving}
      onDraftChange={controller.setDraftField}
      onSave={() => void controller.saveCompany()}
      onDelete={() => void controller.deleteCompany()}
      onClose={page.closePage}
      onPropertyDraftChange={controller.setPropertyDraftField}
      onOpenProperty={navigateToProperty}
      onOpenCreateProperty={controller.toggleCreateProperty}
      onCancelCreateProperty={controller.cancelCreateProperty}
      onCreateProperty={() => void createPropertyAndOpen()}
      isCreatingProperty={controller.isCreatingProperty}
    />
  )
}
