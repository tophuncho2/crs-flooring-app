"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { ImportRow } from "@builders/domain"

export type { ImportRow } from "@builders/domain"

export function useImportsListController({
  initialImports,
}: {
  initialImports: ImportRow[]
}) {
  const importNavigation = useRecordEntryNavigation("/dashboard/imports")
  const [imports, setImports] = useState(initialImports)
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    imports,
    message,
    pageError,
    openCreate: importNavigation.openCreate,
    openImport: importNavigation.openRecord,
  }
}
