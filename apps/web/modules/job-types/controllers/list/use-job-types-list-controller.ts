"use client"

import { useState } from "react"

export function useJobTypesListController() {
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
  }
}
