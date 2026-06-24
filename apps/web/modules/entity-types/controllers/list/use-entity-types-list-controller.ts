"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useEntityTypesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/entity-types")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openEntityType: navigation.openRecord,
  }
}
