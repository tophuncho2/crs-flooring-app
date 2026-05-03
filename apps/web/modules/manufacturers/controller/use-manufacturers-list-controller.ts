"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useManufacturersListController() {
  const navigation = useRecordEntryNavigation("/dashboard/manufacturers")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openManufacturer: navigation.openRecord,
  }
}
