"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { createUnitOfMeasure, deleteUnitOfMeasure } from "../data/mutations"
import { EMPTY_UNIT_OF_MEASURE_FORM, validateUnitOfMeasureForm, type UnitOfMeasureForm, type UnitOfMeasureRow } from "../domain/types"

export function useUnitOfMeasuresListController(initialRows: UnitOfMeasureRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [createDraft, setCreateDraft] = useState<UnitOfMeasureForm>(EMPTY_UNIT_OF_MEASURE_FORM)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  function openCreateModal() {
    notices.clearNotices()
    setCreateDraft(EMPTY_UNIT_OF_MEASURE_FORM)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingCreate) {
      return
    }

    notices.clearNotices()
    setIsCreateModalOpen(false)
  }

  function updateCreateDraft(value: string) {
    setCreateDraft({ name: value })
  }

  async function submitCreate() {
    notices.clearNotices()
    const validationError = validateUnitOfMeasureForm(createDraft)
    if (validationError) {
      notices.showError(validationError)
      return null
    }

    setIsSavingCreate(true)
    try {
      const payload = await createUnitOfMeasure(createDraft)
      setRows((previous) => [...previous, payload.unitOfMeasure].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateDraft(EMPTY_UNIT_OF_MEASURE_FORM)
      setIsCreateModalOpen(false)
      notices.showSuccess("Unit of measure created")
      return payload.unitOfMeasure
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to save unit of measure")
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function removeRow(row: UnitOfMeasureRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("unit of measure"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(row.id)
    try {
      await deleteUnitOfMeasure(row.id)
      setRows((previous) => previous.filter((item) => item.id !== row.id))
      notices.showSuccess("Unit of measure deleted")
      return true
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete unit of measure")
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
