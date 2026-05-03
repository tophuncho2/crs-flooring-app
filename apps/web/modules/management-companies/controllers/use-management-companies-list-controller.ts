"use client"

import { useState } from "react"
import { useRecordEntryNavigation } from "@/hooks/navigation"

export function useManagementCompaniesListController() {
  const navigation = useRecordEntryNavigation("/dashboard/management-companies")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: navigation.openCreate,
    openCompany: navigation.openRecord,
  }
}
