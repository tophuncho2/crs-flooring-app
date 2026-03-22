"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { createManufacturerRequest, deleteManufacturerRequest } from "../data/mutations"
import { EMPTY_MANUFACTURER_FORM, type ManufacturerForm, type ManufacturerRow } from "../domain/types"
import { validateManufacturerForm } from "../domain/validators"

export function useManufacturersListController(initialRows: ManufacturerRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [createDraft, setCreateDraft] = useState<ManufacturerForm>(EMPTY_MANUFACTURER_FORM)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  function openCreateModal() {
    notices.clearNotices()
    setCreateDraft(EMPTY_MANUFACTURER_FORM)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingCreate) {
      return
    }

    notices.clearNotices()
    setIsCreateModalOpen(false)
  }

  function updateCreateDraft(field: keyof ManufacturerForm, value: string) {
    setCreateDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function submitCreate() {
    notices.clearNotices()
    const validationError = validateManufacturerForm(createDraft, rows)
    if (validationError) {
      notices.showError(validationError)
      return null
    }

    setIsSavingCreate(true)
    try {
      const payload = await createManufacturerRequest(createDraft)
      setRows((previous) => [payload.manufacturer, ...previous].sort((a, b) => a.companyName.localeCompare(b.companyName)))
      setCreateDraft(EMPTY_MANUFACTURER_FORM)
      setIsCreateModalOpen(false)
      notices.showSuccess("Manufacturer created")
      return payload.manufacturer
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to save manufacturer")
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function removeRow(row: ManufacturerRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("manufacturer"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(row.id)
    try {
      await deleteManufacturerRequest(row.id)
      setRows((previous) => previous.filter((item) => item.id !== row.id))
      notices.showSuccess("Manufacturer deleted")
      return true
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete manufacturer")
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
