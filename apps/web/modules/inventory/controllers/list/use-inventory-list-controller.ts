"use client"

import { useState } from "react"

// List-scoped notice/error state. Row clicks no longer navigate to a detail
// page — the list client opens the inventory hub side panel in place — so this
// controller no longer owns any navigation.
export function useInventoryListController() {
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
  }
}
