"use client"

import { useState } from "react"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import { useRecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import type { InventoryRow } from "@/features/flooring/inventory/domain/types"

export function useInventoryListController({
  initialInventory,
}: {
  initialInventory: InventoryRow[]
}) {
  const inventoryNavigation = useCanonicalDetailNavigation("/dashboard/flooring/inventory")
  const notices = useRecordNotices()
  const [rows, setRows] = useState(initialInventory)
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null)

  async function deleteInventory(id: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("inventory row"))) {
      return
    }

    notices.clearNotices()
    setDeletingInventoryId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/inventory/${id}`, { method: "DELETE" })
      setRows((previous) => previous.filter((row) => row.id !== id))
      notices.showSuccess("Inventory deleted")
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete inventory")
    } finally {
      setDeletingInventoryId(null)
    }
  }

  return {
    rows,
    notices,
    deletingInventoryId,
    openInventory: inventoryNavigation.openRecord,
    deleteInventory,
  }
}
