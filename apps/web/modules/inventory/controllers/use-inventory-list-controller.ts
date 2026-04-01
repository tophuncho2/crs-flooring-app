"use client"

import { useState } from "react"
import { useCanonicalDetailNavigation } from "@/modules/shared/engines/common/navigation/use-canonical-detail-navigation"
import { useRecordNotices } from "@/modules/shared/engines/record-view/client/hooks/use-record-notices"
import type { InventoryRow } from "@/modules/inventory/domain/types"

export function useInventoryListController({
  initialInventory,
}: {
  initialInventory: InventoryRow[]
}) {
  const inventoryNavigation = useCanonicalDetailNavigation("/dashboard/inventory")
  const notices = useRecordNotices()
  const [rows, setRows] = useState(initialInventory)

  return {
    rows,
    notices,
    openInventory: inventoryNavigation.openRecord,
  }
}
