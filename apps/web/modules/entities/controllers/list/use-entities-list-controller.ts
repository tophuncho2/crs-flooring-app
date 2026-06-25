"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useEntitiesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/entities")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openEntity: navigation.openRecord,
  }
}
