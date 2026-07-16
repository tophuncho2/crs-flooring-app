"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useWorkOrderDocumentTypesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/work-order-document-types")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openWorkOrderDocumentType: navigation.openRecord,
  }
}
