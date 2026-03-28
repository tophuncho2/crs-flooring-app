"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { createContactRequest, deleteContactRequest } from "../data/mutations"
import { EMPTY_CONTACT_FORM, validateContactForm, type ContactForm, type ContactRow } from "../domain/types"

export function useContactsListController(initialRows: ContactRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [createDraft, setCreateDraft] = useState<ContactForm>(EMPTY_CONTACT_FORM)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  function openCreateModal() {
    notices.clearNotices()
    setCreateDraft(EMPTY_CONTACT_FORM)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingCreate) {
      return
    }

    notices.clearNotices()
    setIsCreateModalOpen(false)
  }

  function updateCreateDraft(field: keyof ContactForm, value: string) {
    setCreateDraft((previous) => ({ ...previous, [field]: value as ContactForm[keyof ContactForm] }))
  }

  async function submitCreate() {
    notices.clearNotices()
    const validationError = validateContactForm(createDraft)
    if (validationError) {
      notices.showError(validationError)
      return null
    }

    setIsSavingCreate(true)
    try {
      const payload = await createContactRequest(createDraft)
      setRows((previous) => [payload.contact, ...previous].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateDraft(EMPTY_CONTACT_FORM)
      setIsCreateModalOpen(false)
      notices.showSuccess("Contact created")
      return payload.contact
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to create contact")
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function removeRow(row: ContactRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("contact"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(row.id)
    try {
      await deleteContactRequest(row.id)
      setRows((previous) => previous.filter((item) => item.id !== row.id))
      notices.showSuccess("Contact deleted")
      return true
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete contact")
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return {
    rows,
    createDraft,
    isCreateModalOpen,
    isSavingCreate,
    deletingId,
    notices,
    openCreateModal,
    closeCreateModal,
    updateCreateDraft,
    submitCreate,
    removeRow,
  }
}
