"use client"

import { useState } from "react"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteManufacturerRequest, updateManufacturerRequest } from "../data/mutations"
import { toManufacturerForm, type ManufacturerRow } from "../domain/types"
import { validateManufacturerForm } from "../domain/validators"

export function useManufacturerRecordController({
  initialManufacturer,
  backHref,
}: {
  initialManufacturer: ManufacturerRow
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved manufacturer changes. Leave this manufacturer without saving?",
  })
  const [manufacturer, setManufacturer] = useState(initialManufacturer)
  const [draft, setDraft] = useState(() => toManufacturerForm(initialManufacturer))
  const [isSaving, setIsSaving] = useState(false)

  function updateDraft(field: keyof typeof draft, value: string) {
    page.notices.clearNotices()
    page.setIsDirty(true)
    setDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function save() {
    page.notices.clearNotices()
    const validationError = validateManufacturerForm(draft, [manufacturer], manufacturer.id)
    if (validationError) {
      page.notices.showError(validationError)
      return false
    }

    setIsSaving(true)
    try {
      const payload = await updateManufacturerRequest(manufacturer.id, draft)
      setManufacturer(payload.manufacturer)
      setDraft(toManufacturerForm(payload.manufacturer))
      page.setIsDirty(false)
      page.notices.showSuccess("Manufacturer updated")
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to save manufacturer")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("manufacturer"))) {
      return false
    }

    page.notices.clearNotices()
    setIsSaving(true)
    try {
      await deleteManufacturerRequest(manufacturer.id)
      page.redirectToBack()
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to delete manufacturer")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    manufacturer,
    draft,
    isSaving,
    notices: page.notices,
    closePage: page.closePage,
    updateDraft,
    save,
    remove,
  }
}
