"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function usePropertiesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/properties")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openProperty: navigation.openRecord,
  }
}
