"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"

export function useTemplatesListController() {
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: templateNavigation.openCreate,
    openTemplate: templateNavigation.openRecord,
  }
}
