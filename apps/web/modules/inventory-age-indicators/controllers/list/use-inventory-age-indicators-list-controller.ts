"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useInventoryAgeIndicatorsListController() {
  const navigation = useRecordEntryNavigation("/dashboard/inventory-age-indicators")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openInventoryAgeIndicator: navigation.openRecord,
  }
}
