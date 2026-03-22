"use client"

import { useState } from "react"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteUnitOfMeasure, updateUnitOfMeasure } from "../data/mutations"
import { toUnitOfMeasureForm, validateUnitOfMeasureForm, type UnitOfMeasureRow } from "../domain/types"

export function useUnitOfMeasuresRecordController({
  initialUnitOfMeasure,
  backHref,
}: {
  initialUnitOfMeasure: UnitOfMeasureRow
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved unit of measure changes. Leave this unit of measure without saving?",
  })
  const [unitOfMeasure, setUnitOfMeasure] = useState(initialUnitOfMeasure)
  const [draft, setDraft] = useState(() => toUnitOfMeasureForm(initialUnitOfMeasure))
  const [isSaving, setIsSaving] = useState(false)

  function updateName(value: string) {
    page.notices.clearNotices()
    page.setIsDirty(true)
    setDraft({ name: value })
  }

  async function save() {
    page.notices.clearNotices()
    const validationError = validateUnitOfMeasureForm(draft)
    if (validationError) {
      page.notices.showError(validationError)
      return false
    }

    setIsSaving(true)
    try {
      const payload = await updateUnitOfMeasure(unitOfMeasure.id, draft)
      setUnitOfMeasure(payload.unitOfMeasure)
      setDraft(toUnitOfMeasureForm(payload.unitOfMeasure))
      page.setIsDirty(false)
      page.notices.showSuccess("Unit of measure updated")
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to save unit of measure")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("unit of measure"))) {
      return false
    }

    page.notices.clearNotices()
    setIsSaving(true)
    try {
      await deleteUnitOfMeasure(unitOfMeasure.id)
      page.redirectToBack()
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to delete unit of measure")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    unitOfMeasure,
    draft,
    isSaving,
    notices: page.notices,
    closePage: page.closePage,
    updateName,
    save,
    remove,
  }
}
