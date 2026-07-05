"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { buildCurrentRecordEntryPath, buildWorkOrderRecordHref } from "@/hooks/navigation"
import { syncTemplateToWorkOrderRequest } from "@/modules/templates/data/mutations"

export function useTemplateSyncToWorkOrder(templateId: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
      // mode-from-`?view` initializer). `returnTo` is the current template hub URL so
      // the WO record's Back button returns to this hub, not the work-orders list.
      const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)
      router.push(buildWorkOrderRecordHref(result.workOrder.id, { view: "requested", returnTo }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Try again."
      setErrorMessage(message)
      setIsSyncing(false)
    }
  }, [templateId, isSyncing, router, pathname, searchParams])

  return { sync, isSyncing, errorMessage }
}
