"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useCertificatesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/certificate-tracking")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openCertificate: navigation.openRecord,
  }
}
