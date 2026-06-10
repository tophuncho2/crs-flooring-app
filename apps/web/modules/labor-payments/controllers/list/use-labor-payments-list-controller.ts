"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useLaborPaymentsListController() {
  const navigation = useRecordEntryNavigation("/dashboard/labor-payments")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openLaborPayment: navigation.openRecord,
  }
}
