"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function usePaymentPurposesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/payment-purposes")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openPaymentPurpose: navigation.openRecord,
  }
}
