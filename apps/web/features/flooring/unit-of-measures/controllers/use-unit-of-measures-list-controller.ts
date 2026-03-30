"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteUnitOfMeasure } from "../data/mutations"
import type { UnitOfMeasureRow } from "../domain/types"

export function useUnitOfMeasuresListController(initialRows: UnitOfMeasureRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

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
    deletingId,
    notices,
    removeRow,
  }
}
