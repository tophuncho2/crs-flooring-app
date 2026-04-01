"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/dashboard/shared/table/confirm-delete"
import { deleteServiceRequest } from "../data/mutations"
import type { ServiceRow } from "../domain/types"

export function useServicesListController(initialRows: ServiceRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

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
    deletingId,
    notices,
    removeRow,
  }
}
