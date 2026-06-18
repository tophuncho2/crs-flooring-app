"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { syncTemplateToWorkOrderRequest } from "@/modules/templates/data/mutations"

export function useTemplateSyncToWorkOrder(templateId: string) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sync = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setErrorMessage(null)
    try {
      const result = await syncTemplateToWorkOrderRequest(templateId)
      // Open straight into the Requested Material view — the materials this sync
      // just created — instead of the default Adjustments view (see the section's
      // mode-from-`?view` initializer).
      router.push(`/dashboard/work-orders/${result.workOrder.id}?view=requested`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Try again."
      setErrorMessage(message)
      setIsSyncing(false)
    }
  }, [templateId, isSyncing, router])

  return { sync, isSyncing, errorMessage }
}
