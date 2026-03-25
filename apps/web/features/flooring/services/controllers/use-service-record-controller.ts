"use client"

import { useState } from "react"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteServiceRequest, updateServiceRequest } from "../data/mutations"
import { toServiceForm, validateServiceForm, type ServiceRow } from "../domain/types"

export function useServiceRecordController({
  initialService,
  backHref,
}: {
  initialService: ServiceRow
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved service changes. Leave this service without saving?",
  })
  const [service, setService] = useState(initialService)
  const [draft, setDraft] = useState(() => toServiceForm(initialService))
  const [isSaving, setIsSaving] = useState(false)

  function updateDraft(field: keyof typeof draft, value: string) {
    page.notices.clearNotices()
    page.setIsDirty(true)
    setDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function save() {
    page.notices.clearNotices()
    const validationError = validateServiceForm(draft)
    if (validationError) {
      page.notices.showError(validationError)
      return false
    }

    setIsSaving(true)
    try {
      const payload = await updateServiceRequest(service.id, draft)
      setService(payload.service)
      setDraft(toServiceForm(payload.service))
      page.setIsDirty(false)
      page.notices.showSuccess("Service saved")
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to save service")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("service"))) {
      return false
    }

    page.notices.clearNotices()
    setIsSaving(true)
    try {
      await deleteServiceRequest(service.id)
      page.redirectToBack()
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to delete service")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    service,
    draft,
    isSaving,
    notices: page.notices,
    closePage: page.closePage,
    updateDraft,
    save,
    remove,
  }
}
