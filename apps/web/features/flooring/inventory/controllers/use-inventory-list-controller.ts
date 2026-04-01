"use client"

import { useState } from "react"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import { useRecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import type { InventoryRow } from "@/features/flooring/inventory/domain/types"

export function useInventoryListController({
  initialInventory,
}: {
  initialInventory: InventoryRow[]
}) {
  const inventoryNavigation = useCanonicalDetailNavigation("/dashboard/flooring/inventory")
  const notices = useRecordNotices()
  const [rows, setRows] = useState(initialInventory)

  return {
    rows,
    notices,
    openInventory: inventoryNavigation.openRecord,
  }
}
