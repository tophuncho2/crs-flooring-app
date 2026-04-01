"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/dashboard/shared/table/confirm-delete"
import { deleteCategoryRequest } from "../data/mutations"
import type { CategoryRow } from "../domain/types"

export function useCategoriesListController(initialRows: CategoryRow[]) {
  const [rows, setRows] = useState(initialRows)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  async function removeRow(row: CategoryRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("category"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(row.id)
    try {
      await deleteCategoryRequest(row.id)
      setRows((previous) => previous.filter((item) => item.id !== row.id))
      notices.showSuccess("Category deleted")
      return true
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete category")
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
