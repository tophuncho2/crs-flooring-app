"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { createServiceRequest, deleteServiceRequest } from "../data/mutations"
import { EMPTY_SERVICE_FORM, validateServiceForm, type ServiceForm, type ServiceRow } from "../domain/types"

export function useServicesListController(initialRows: ServiceRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [createDraft, setCreateDraft] = useState<ServiceForm>(EMPTY_SERVICE_FORM)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  function openCreateModal() {
    notices.clearNotices()
    setCreateDraft(EMPTY_SERVICE_FORM)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingCreate) {
      return
    }

    notices.clearNotices()
    setIsCreateModalOpen(false)
  }

  function updateCreateDraft(field: keyof ServiceForm, value: string) {
    setCreateDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function submitCreate() {
    notices.clearNotices()
    const validationError = validateServiceForm(createDraft)
    if (validationError) {
      notices.showError(validationError)
      return null
    }

    setIsSavingCreate(true)
    try {
      const payload = await createServiceRequest(createDraft)
      setRows((previous) => [payload.service, ...previous].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateDraft(EMPTY_SERVICE_FORM)
      setIsCreateModalOpen(false)
      notices.showSuccess("Service created")
      return payload.service
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to save service")
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function removeRow(row: ServiceRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("service"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(row.id)
    try {
      await deleteServiceRequest(row.id)
      setRows((previous) => previous.filter((item) => item.id !== row.id))
      notices.showSuccess("Service deleted")
      return true
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete service")
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
