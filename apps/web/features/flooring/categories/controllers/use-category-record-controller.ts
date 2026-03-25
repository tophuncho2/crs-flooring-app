"use client"

import { useState } from "react"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteCategoryRequest, updateCategoryRequest } from "../data/mutations"
import { toCategoryForm, type CategoryRow } from "../domain/types"
import { validateCategoryForm } from "../domain/validators"

export function useCategoryRecordController({
  initialCategory,
  backHref,
}: {
  initialCategory: CategoryRow
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved category changes. Leave this category without saving?",
  })
  const [category, setCategory] = useState(initialCategory)
  const [draft, setDraft] = useState(() => toCategoryForm(initialCategory))
  const [isSaving, setIsSaving] = useState(false)

  function updateDraft(field: keyof typeof draft, value: string) {
    page.notices.clearNotices()
    page.setIsDirty(true)
    setDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function save() {
    page.notices.clearNotices()
    const validationError = validateCategoryForm(draft, [category], category.id)
    if (validationError) {
      page.notices.showError(validationError)
      return false
    }

    setIsSaving(true)
    try {
      const payload = await updateCategoryRequest(category.id, draft)
      setCategory(payload.category)
      setDraft(toCategoryForm(payload.category))
      page.setIsDirty(false)
      page.notices.showSuccess("Category updated")
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to save category")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("category"))) {
      return false
    }

    page.notices.clearNotices()
    setIsSaving(true)
    try {
      await deleteCategoryRequest(category.id)
      page.redirectToBack()
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to delete category")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    category,
    draft,
    isSaving,
    notices: page.notices,
    closePage: page.closePage,
    updateDraft,
    save,
    remove,
  }
}
