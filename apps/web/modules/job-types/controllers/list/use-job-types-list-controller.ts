"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useJobTypesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/job-types")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openJobType: navigation.openRecord,
  }
}
