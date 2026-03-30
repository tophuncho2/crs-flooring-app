"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { deleteContactRequest } from "../data/mutations"
import type { ContactRow } from "../domain/types"

export function useContactsListController(initialRows: ContactRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

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
    deletingId,
    notices,
    removeRow,
  }
}
