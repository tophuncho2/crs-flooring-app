"use client"

import { useState } from "react"
import { useCanonicalDetailNavigation } from "@/modules/shared/engines/common/navigation/use-canonical-detail-navigation"

export function useInventoryListController() {
  const inventoryNavigation = useCanonicalDetailNavigation("/dashboard/inventory")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openInventory: inventoryNavigation.openRecord,
  }
}
