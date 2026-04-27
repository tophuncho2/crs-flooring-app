"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"

export type { ImportRow } from "@builders/domain"

export function useImportsListController() {
  const importNavigation = useRecordEntryNavigation("/dashboard/imports")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: importNavigation.openCreate,
    openImport: importNavigation.openRecord,
  }
}
