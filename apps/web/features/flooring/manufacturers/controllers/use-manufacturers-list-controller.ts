"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { deleteManufacturerRequest } from "../data/mutations"
import type { ManufacturerRow } from "../domain/types"

export function useManufacturersListController(initialRows: ManufacturerRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

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
    deletingId,
    notices,
    removeRow,
  }
}
