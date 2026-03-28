"use client"

import { useState } from "react"
import { useRecordPageController } from "@/features/dashboard/shared/record-view/client/use-record-page-controller"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { deleteContactRequest, updateContactRequest } from "../data/mutations"
import { toContactForm, validateContactForm, type ContactDetail } from "../domain/types"

export function useContactRecordController({
  initialContact,
  backHref,
}: {
  initialContact: ContactDetail
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved contact changes. Leave this contact without saving?",
  })
  const [contact, setContact] = useState(initialContact)
  const [draft, setDraft] = useState(() => toContactForm(initialContact))
  const [isSaving, setIsSaving] = useState(false)

  function updateDraft(field: keyof typeof draft, value: string) {
    page.notices.clearNotices()
    page.setIsDirty(true)
    setDraft((previous) => ({ ...previous, [field]: value as (typeof draft)[keyof typeof draft] }))
  }

  async function save() {
    page.notices.clearNotices()
    const validationError = validateContactForm(draft)
    if (validationError) {
      page.notices.showError(validationError)
      return false
    }

    setIsSaving(true)
    try {
      const payload = await updateContactRequest(contact.id, draft)
      setContact(payload.contact)
      setDraft(toContactForm(payload.contact))
      page.setIsDirty(false)
      page.notices.showSuccess("Contact saved")
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to save contact")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("contact"))) {
      return false
    }

    page.notices.clearNotices()
    setIsSaving(true)
    try {
      await deleteContactRequest(contact.id)
      page.redirectToBack()
      return true
    } catch (error) {
      page.notices.showError(error instanceof Error ? error.message : "Failed to delete contact")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    contact,
    draft,
    isSaving,
    notices: page.notices,
    closePage: page.closePage,
    updateDraft,
    save,
    remove,
  }
}
