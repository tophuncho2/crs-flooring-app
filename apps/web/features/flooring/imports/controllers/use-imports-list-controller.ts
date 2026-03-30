"use client"

import { useState } from "react"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import type { ImportRow } from "../domain/types"

export type { ImportRow } from "../domain/types"

export function useImportsListController({
  initialImports,
}: {
  initialImports: ImportRow[]
}) {
  const importNavigation = useRecordEntryNavigation("/dashboard/flooring/imports")
  const [imports, setImports] = useState(initialImports)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  function clearPageNotices() {
    setMessage("")
    setPageError("")
  }

  async function deleteImport(id: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("import"))) {
      return
    }

    clearPageNotices()
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/imports/${id}`, { method: "DELETE" })
      setImports((previous) => previous.filter((row) => row.id !== id))
      setMessage("Import deleted")
    } catch (deleteError) {
      setPageError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
    } finally {
      setDeletingId(null)
    }
  }

  return {
    imports,
    deletingId,
    message,
    pageError,
    deleteImport,
    openCreate: importNavigation.openCreate,
    openImport: importNavigation.openRecord,
  }
}
