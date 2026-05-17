"use client"

import { useState } from "react"

export function useManagementCompaniesListController() {
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
  }
}
