"use client"

import { useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/transport/client-errors"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/table/confirm-delete"
import { useRecordNotices } from "@/features/shared/engines/record-view"
import type { TemplateRow } from "../types"

export function useTemplatesClientController(initialTemplates: TemplateRow[]) {
  const [rows, setRows] = useState<TemplateRow[]>(initialTemplates)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  async function deleteTemplate(id: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("template"))) {
      return false
    }

    notices.clearNotices()
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${id}`, { method: "DELETE" })
      setRows((previous) => previous.filter((template) => template.id !== id))
      notices.showSuccess("Template deleted")
      return true
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to delete template"))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return {
    rows,
    deletingId,
    notices,
    deleteTemplate,
  }
}
